import {
    AttachmentPayload,
    EmbedType,
    Guild,
    GuildMember,
    Message,
    MessageCreateOptions,
    MessageFlags,
    MessagePayload,
    MessageType,
    PartialMessage,
    TextChannel,
    User,
    WebhookMessageCreateOptions,
} from "discord.js";
import { fstatSync, openSync } from "node:fs";
import api from "./api.js";
import bot from "./bot.js";
import db from "./db.js";
import logger from "./logger.js";
import { greyButton } from "./responses.js";
import stickerCache from "./sticker-cache.js";
import { GlobalChannel, GlobalConnection, GlobalMessage } from "./types.js";

export function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getConnection(channelId: string, overrideId?: number | null) {
    if (overrideId != undefined) return overrideId;

    const doc = await db.connections.findOne({ channel: channelId });
    if (!doc) throw "This is not a global channel.";

    return doc.id;
}

export async function log(obj: number | GlobalChannel | string, payload: string | MessagePayload | MessageCreateOptions | WebhookMessageCreateOptions) {
    try {
        const id = typeof obj === "string" ? obj : (typeof obj === "number" ? await db.channels.findOne({ id: obj }) : obj)!.logs;
        const channel = (await bot.channels.fetch(id)) as TextChannel;

        const webhook = await getWebhook(channel);

        if (webhook) await webhook.send(payload);
        else await channel.send(payload);
    } catch (error) {
        logger.error(error, "515e05cc-1a86-4fdf-9f83-5c74d5fb7e2b");
    }
}

export async function fetchName(user: User | GuildMember | undefined | null | void, showTag: boolean) {
    if (!user) return "[User Not Found]";

    if (showTag) return user instanceof GuildMember ? user.user.tag : user.tag;

    const entry = await db.users.findOne({ id: user.id });
    if (entry?.nickname) return entry.nickname;

    return user instanceof GuildMember ? user.displayName : user.username;
}

export async function fetchGuildName(guild: Guild | string) {
    const id = typeof guild === "string" ? guild : guild.id;

    if (id === Bun.env.HQ) return "TCN HQ";
    if (id === Bun.env.HUB) return "TCN Hub";

    const apiGuild: { name: string } | undefined = await api(`/guilds/${id}`).catch(() => {});
    return apiGuild?.name ?? (typeof guild === "string" ? `Unknown Guild ${guild}` : guild.name);
}

let usedWebhooks = new Set<string>();
let loaded = false;
let loading = false;

export async function isUsedWebhook(id: string) {
    if (!loaded) {
        const val = (await db.webhooks.countDocuments({ id })) > 0;

        if (!loading) {
            loading = true;

            db.webhooks
                .find()
                .toArray()
                .then((x) => ((usedWebhooks = new Set(x.map((x) => x.id))), (loaded = true)));
        }

        return val;
    }

    return usedWebhooks.has(id);
}

export async function getWebhook(channel: TextChannel) {
    try {
        const webhooks = await channel.fetchWebhooks();
        const webhook =
            webhooks
                .filter((x) => x.token)
                .sort((x, y) => (x.applicationId ? 1 : 0) - (y.applicationId ? 1 : 0))
                .first() ?? (await channel.createWebhook({ name: "TCN Global Chat" }));

        usedWebhooks.add(webhook.id);
        await db.webhooks.updateOne({ id: webhook.id }, { $set: { id: webhook.id } }, { upsert: true });

        return webhook;
    } catch {}
}

export async function constructMessages(
    message: Message | PartialMessage,
    configs: (Pick<GlobalConnection, "replyStyle" | "showServers" | "showTag"> & { channel?: string; noReply?: boolean })[],
): Promise<WebhookMessageCreateOptions[]> {
    const data: WebhookMessageCreateOptions[] = [];
    const base: WebhookMessageCreateOptions = { content: "", embeds: [], files: [], components: [] };

    if ([MessageType.ChatInputCommand, MessageType.ContextMenuCommand].includes(message.type ?? 0) && message.flags.has(MessageFlags.Loading))
        base.components = greyButton("Loading command response...");
    else {
        if (message.content) base.content = message.content.slice(0, 2000);

        const attachments: AttachmentPayload[] = [];

        for (const attachment of message.attachments.values()) attachments.push({ attachment: attachment.url, name: attachment.name });

        let failed = false;

        for (const sticker of message.stickers.values()) {
            if (attachments.length >= 10) break;

            try {
                const path = await stickerCache.fetch(sticker);
                if (!path) throw 0;
                if (fstatSync(openSync(path, "r")).size === 0) throw 0;

                attachments.push({ attachment: path, name: `${sticker.name}.${stickerCache.ext(sticker)}` });
            } catch (error) {
                failed = true;
                if (error !== 0) logger.error(error, "870af069-c4a5-4f5a-b24d-6f76bd2c5690");
            }
        }

        base.files = attachments;

        if (message.embeds) base.embeds = message.embeds.filter((embed) => embed.data.type === EmbedType.Rich).map((embed) => embed.toJSON());
        else base.embeds = [];

        if (failed && base.embeds.length < 10)
            base.embeds.push({ description: "One or more stickers was not able to be converted to an image to be relayed.", color: 0x2b2d31 });
    }

    let _ref: Message | undefined;
    let doc: GlobalMessage | undefined | null;
    let ref: Message | undefined | null;
    let author: User | undefined;
    let source: string | undefined;

    if (message.type === MessageType.Reply && configs.some((x) => !x.noReply))
        try {
            _ref = await message.fetchReference();

            doc = await db.messages.findOne({
                $or: [{ channel: _ref.channelId, message: _ref.id }, { instances: { channel: _ref.channelId, message: _ref.id } }],
            });

            if (!doc) throw 0;

            author = (await bot.users.fetch(doc.author).catch(() => {})) ?? undefined;
            source = doc.guild;
        } catch {
            ref = null;
        }

    const authorNameWithTag = author && (await fetchName(author, true));
    const authorNameWithoutTag = author && (await fetchName(author, false));
    const name = source && (await fetchGuildName(source));

    for (const { channel, replyStyle, showServers, showTag, noReply } of configs) {
        const copy: WebhookMessageCreateOptions = { ...base };

        if (!noReply && doc) {
            if (ref !== null)
                if (doc.channel === channel) ref = await ((await bot.channels.fetch(channel)) as TextChannel).messages.fetch(doc.message);
                else {
                    const instance = doc.instances.find((x) => x.channel === channel);
                    ref = instance ? await ((await bot.channels.fetch(channel!)) as TextChannel).messages.fetch(instance.message) : null;
                }

            const authorName = showTag ? authorNameWithTag : authorNameWithoutTag;

            if (ref)
                if (replyStyle === "embed")
                    copy.embeds = [
                        {
                            author: {
                                name: `${authorName}${showServers ? ` from ${name}**` : ""}`,
                                icon_url: ref.author.displayAvatarURL(),
                            },
                            title: `jump to referenced message`,
                            url: ref.url,
                            description: ref.content ? (ref.content.length > 500 ? `${ref.content.slice(0, 500)}...` : ref.content) : "",
                        },
                        ...(copy.embeds ?? []),
                    ].slice(0, 10);
                else
                    copy.content = `${Bun.env.REPLY} **${authorName}**${showServers ? ` from **${name}**` : ""}: [original message](${ref.url})\n${
                        copy.content ?? ""
                    }`.slice(0, 2000);
            else if (ref === null) copy.content = `${Bun.env.REPLY} **[Original Not Found]**\n${copy.content ?? ""}`.slice(0, 2000);
        }

        data.push(copy);
    }

    return data;
}

export async function addProfile(
    out: WebhookMessageCreateOptions,
    user: GuildMember | User | undefined | null | void,
    guild: Guild | null,
    showServers: boolean,
    showTag: boolean,
) {
    return {
        ...out,
        avatarURL: user?.displayAvatarURL(),
        username: `${await fetchName(user, showTag)} ${showServers ? `from ${guild ? await fetchGuildName(guild) : "unknown guild"}` : ""}`.trim().slice(0, 80),
    };
}
