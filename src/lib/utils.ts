import {
    AttachmentPayload,
    Guild,
    GuildMember,
    Message,
    MessageCreateOptions,
    MessagePayload,
    MessageType,
    TextChannel,
    User,
    WebhookMessageCreateOptions,
    WebhookMessageEditOptions,
} from "discord.js";
import api from "./api.js";
import bot from "./bot.js";
import db from "./db.js";
import logger from "./logger.js";
import stickerCache from "./sticker-cache.js";
import { GlobalChannel, GlobalConnection } from "./types.js";

export function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getConnection(channelId: string, overrideId?: number | null) {
    if (overrideId != undefined) return overrideId;

    const doc = await db.connections.findOne({ channel: channelId });
    if (!doc) throw "This is not a global channel.";

    return doc.id;
}

export async function log(obj: number | GlobalChannel | string, payload: string | MessagePayload | MessageCreateOptions) {
    try {
        const id = typeof obj === "string" ? obj : (typeof obj === "number" ? await db.channels.findOne({ id: obj }) : obj)!.logs;
        const channel = (await bot.channels.fetch(id)) as TextChannel;
        await channel.send(payload);
    } catch (error) {
        logger.error(error, "515e05cc-1a86-4fdf-9f83-5c74d5fb7e2b");
    }
}

export async function fetchName(user: User | GuildMember | undefined | null, showTag: boolean) {
    if (!user) return "[User Not Found]";

    if (showTag) return user instanceof GuildMember ? user.displayName : user.tag;

    const entry = await db.users.findOne({ id: user.id });
    if (entry?.nickname) return entry.nickname;

    return user instanceof GuildMember ? user.displayName : user.tag;
}

export async function fetchGuildName(guild: Guild) {
    const apiGuild: { name: string } | undefined = await api(`/guilds/${guild.id}`).catch();
    return apiGuild?.name ?? guild.name;
}

export async function getWebhook(channel: TextChannel) {
    try {
        const webhooks = await channel.fetchWebhooks();
        const webhook = webhooks.first() ?? (await channel.createWebhook({ name: "TCN Global Chat" }));

        await db.webhooks.updateOne({ id: webhook.id }, { $setOnInsert: { id: webhook.id } }, { upsert: true });

        return webhook;
    } catch {}
}

export async function constructMessage(
    message: Message,
    { channel, replyStyle, showServers, showTag }: GlobalConnection,
): Promise<WebhookMessageCreateOptions & WebhookMessageEditOptions> {
    const data: WebhookMessageCreateOptions & WebhookMessageEditOptions = {};

    if (message.content) data.content = message.content.slice(0, 2000);

    const attachments: AttachmentPayload[] = [];

    for (const attachment of message.attachments.values()) {
        attachments.push({ attachment: attachment.url, name: attachment.name });
    }

    let failed = false;

    for (const sticker of message.stickers.values()) {
        if (attachments.length >= 10) break;

        try {
            const path = await stickerCache.fetch(sticker);
            if (!path) throw 0;

            attachments.push({ attachment: path, name: `${sticker.name}.${stickerCache.ext(sticker)}` });
        } catch (error) {
            failed = true;
            logger.error(error, "870af069-c4a5-4f5a-b24d-6f76bd2c5690");
        }
    }

    data.files = attachments;

    if (message.embeds) data.embeds = message.embeds.map((embed) => embed.toJSON());
    else data.embeds = [];

    if (failed && data.embeds.length < 10)
        data.embeds.push({ description: "One or more stickers was not able to be converted to an image to be relayed.", color: 0x2b2d31 });

    if (message.type === MessageType.Reply) {
        let ref: Message | undefined | null;
        let author: User | undefined;

        try {
            const _ref = await message.fetchReference();

            const doc = await db.messages.findOne({
                $or: [{ channel: _ref.channelId, message: _ref.id }, { instances: { channel: _ref.channelId, message: _ref.id } }],
            });

            if (!doc) throw 0;

            if (doc.channel === channel) ref = await ((await bot.channels.fetch(channel)) as TextChannel).messages.fetch(doc.message);
            else {
                const instance = doc.instances.find((x) => x.channel === channel);
                ref = instance ? await ((await bot.channels.fetch(channel)) as TextChannel).messages.fetch(instance.message) : null;
            }

            author = await bot.users.fetch(doc.author).catch();
        } catch {
            ref = null;
        }

        if (ref)
            if (replyStyle === "embed")
                data.embeds = [
                    {
                        author: {
                            name: `${await fetchName(author, showTag)}${showServers ? ` from ${await fetchGuildName(ref.guild!)}**` : ""}`,
                            icon_url: ref.author.displayAvatarURL(),
                        },
                        title: `jump to referenced message`,
                        url: ref.url,
                        description: ref.content ? (ref.content.length > 500 ? `${ref.content.slice(0, 500)}...` : ref.content) : "",
                    },
                    ...(data.embeds ?? []),
                ].slice(0, 10);
            else
                data.content = `${Bun.env.REPLY} **${await fetchName(author, showTag)}**${
                    showServers ? ` from **${await fetchGuildName(ref.guild!)}**` : ""
                }: [original message](${ref.url})\n${data.content ?? ""}`.slice(0, 2000);
        else if (ref === null) data.content = `${Bun.env.REPLY} **[Original Not Found]**\n${data.content ?? ""}`.slice(0, 2000);
    }

    return data;
}
