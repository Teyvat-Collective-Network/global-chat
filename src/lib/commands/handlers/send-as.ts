import TOML from "@iarna/toml";
import TDE from "@teyvat-collective-network/toml-discord-embeds";
import { ChannelType, ChatInputCommandInteraction, TextChannel, WebhookMessageCreateOptions } from "discord.js";
import api from "../../api.js";
import bot from "../../bot.js";
import db from "../../db.js";
import logger from "../../logger.js";
import { RELAY_CHANNEL_PERMISSIONS_ESSENTIAL, assertMod, assertObserver } from "../../permissions.js";
import Priority from "../../priority.js";
import queue from "../../queue.js";
import { GlobalConnection } from "../../types.js";
import { fetchGuildName, fetchName, getConnection, getWebhook } from "../../utils.js";

export default async function (cmd: ChatInputCommandInteraction, as: number, mode: number, input: string) {
    await cmd.deferReply({ ephemeral: true });

    const id = await getConnection(cmd.channelId);
    const doc = await db.connections.findOne({ id, guild: cmd.guildId! });
    if (!doc) throw "Failed to fetch connection.";
    if (doc.suspended) throw "This instance of this channel is suspended.";

    const channel = await db.channels.findOne({ id });
    if (!channel) throw "?";

    if (cmd.channel?.type !== ChannelType.GuildText) throw "Invalid channel type.";

    let isMod: boolean | undefined;

    if (as === 0 || as === 1) {
        await assertMod(cmd.user, id);
        isMod = true;
    } else if (as === 2) {
        await assertObserver(cmd.user);
        isMod = true;
    }

    if (channel.panic) {
        if (isMod === undefined)
            try {
                await assertMod(cmd.user, id);
                isMod = true;
            } catch {
                isMod = false;
            }

        if (!isMod) throw "This channel is currently in panic mode and only global mods can use this.";
    }

    await queue(Priority.RELAY, async () => {
        const connections = await db.connections.find({ id, suspended: false }).toArray();

        const here = connections.find((x) => x.channel === cmd.channelId);
        if (!here) throw "This channel appears to not be connected anymore.";
        if (here.suspended) throw "This instance of this channel is suspended.";

        const webhook = await getWebhook(cmd.channel as TextChannel);
        if (!webhook) throw "Could not generate webhook in source channel.";

        let data: (connection: GlobalConnection) => WebhookMessageCreateOptions;

        let base: WebhookMessageCreateOptions = {};

        if (mode === 0) base.content = input;
        else if (mode === 1) {
            const raw = await api(`/share-links/${input.split("/").at(-1)}`);
            let parsed: any;

            try {
                parsed = TOML.parse(raw);
            } catch (error) {
                throw `\`\`\`\n${(error as Error).message}\n\`\`\``;
            }

            try {
                base = TDE.convert(parsed) as any;
            } catch (error) {
                throw (error as Error).message;
            }
        }

        const member = as === 0 ? await cmd.guild!.members.fetch(cmd.user) : null;

        const avatarURL = member?.displayAvatarURL();
        const usernameWithTag = await fetchName(member, true);
        const usernameWithoutTag = await fetchName(member, false);

        const guildname = await fetchGuildName(cmd.guild!);

        data = (connection) => ({
            ...base,
            username: `${
                as === 0 ? (connection.showTag ? usernameWithTag : usernameWithoutTag) : as === 1 ? "[Global Moderator]" : as === 2 ? "[TCN Observer]" : "?"
            } ${connection.showServers && connection.channel !== cmd.channelId ? `from ${guildname}` : ""}`,
            avatarURL: as === 0 ? avatarURL : `${Bun.env.WEBSITE}/favicon.png`,
        });

        const message = await webhook.send(data(here));

        const messages = await Promise.all(
            connections.map(async (connection) => {
                try {
                    if (connection.guild === cmd.guildId) return;

                    const output = await bot.channels.fetch(connection.channel);
                    if (output?.type !== ChannelType.GuildText) return;

                    if (!output.permissionsFor(output.client.user)?.has(RELAY_CHANNEL_PERMISSIONS_ESSENTIAL)) {
                        logger.error(`Deliberately skipped replicating message to ${output.id} because of improper permission configuration.`);
                        return;
                    }

                    const webhook = await getWebhook(output);
                    if (!webhook || channel.panic) return;

                    return await webhook.send(data(connection));
                } catch (error) {
                    logger.error(error, "eb4afe59-fbc5-48b4-bc2d-af991ef04679");
                }
            }),
        );

        await db.messages.insertOne({
            id,
            author: message.author.id,
            guild: message.guildId!,
            channel: message.channelId,
            message: message.id,
            instances: messages.filter((x) => x).map((x) => ({ channel: x!.channelId, message: x!.id })),
        });
    });

    return "Your message has been posted.";
}
