import { ChannelType, Events, MessageType } from "discord.js";
import { maybeFilter } from "../../actions.js";
import bot from "../../bot.js";
import db from "../../db.js";
import logger from "../../logger.js";
import { RELAY_CHANNEL_PERMISSIONS_ESSENTIAL } from "../../permissions.js";
import Priority from "../../priority.js";
import queue from "../../queue.js";
import { constructMessages, fetchGuildName, fetchName, getConnection, getWebhook } from "../../utils.js";

bot.on(Events.MessageCreate, async (message) => {
    if (message.channel.type !== ChannelType.GuildText) return;
    if (message.webhookId && message.type !== MessageType.ChatInputCommand && message.type !== MessageType.ContextMenuCommand) return;

    const id = await getConnection(message.channelId).catch(() => {});
    if (!id) return;

    const doc = await db.connections.findOne({ id, guild: message.guildId! });
    if (!doc) return;
    if (doc?.suspended) return;

    await queue(Priority.RELAY, async () => {
        const channel = await db.channels.findOne({ id });
        if (!channel) return;
        if (channel.panic) return;
        if (channel.bans.includes(message.author.id)) return await message.delete().catch(() => {});

        const source = await db.connections.findOne({ id, guild: message.guild!.id });
        if (!source) return;
        if (source.bans.includes(message.author.id)) return await message.delete().catch(() => {});

        if (await maybeFilter(channel, message)) return;

        if (message.flags.has("SuppressNotifications")) return;
        if (![MessageType.ChatInputCommand, MessageType.ContextMenuCommand, MessageType.Default, MessageType.Reply].includes(message.type)) return;

        const connections = await db.connections.find({ id, guild: { $ne: message.guildId! }, suspended: false, bans: { $ne: message.author.id } }).toArray();

        const copies = Object.fromEntries((await constructMessages(message, connections)).map((x, i) => [connections[i].channel, x]));

        const avatarURL = (message.member ?? message.author).displayAvatarURL();
        const usernameWithTag = await fetchName(message.member ?? message.author, true);
        const usernameWithoutTag = await fetchName(message.member ?? message.author, false);
        const guildname = await fetchGuildName(message.guild!);

        const messages = await Promise.all(
            connections.map(async (connection) => {
                try {
                    const { channel: id, showServers, showTag } = connection;

                    const output = await bot.channels.fetch(id);
                    if (output?.type !== ChannelType.GuildText) return;

                    if (!output.permissionsFor(output.client.user)?.has(RELAY_CHANNEL_PERMISSIONS_ESSENTIAL)) {
                        logger.error(`Deliberately skipped replicating message to ${output.id} because of improper permission configuration.`);
                        return;
                    }

                    const webhook = await getWebhook(output);
                    if (!webhook) return;

                    return await webhook.send({
                        ...copies[connection.channel],
                        avatarURL,
                        username: `${showTag ? usernameWithTag : usernameWithoutTag} ${showServers ? `from ${guildname}` : ""}`,
                    });
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
});
