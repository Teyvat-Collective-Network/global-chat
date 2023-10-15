import { ChannelType, Events, MessageType } from "discord.js";
import bot from "../../bot.js";
import db from "../../db.js";
import logger from "../../logger.js";
import Priority from "../../priority.js";
import queue from "../../queue.js";
import { addProfile, constructMessage, getConnection, getWebhook } from "../../utils.js";

bot.on(Events.MessageCreate, async (message) => {
    if (message.channel.type !== ChannelType.GuildText) return;
    if (message.webhookId && message.type !== MessageType.ChatInputCommand && message.type !== MessageType.ContextMenuCommand) return;

    const id = await getConnection(message.channelId).catch();
    if (!id) return;

    const doc = await db.connections.findOne({ id, guild: message.guildId! });
    if (!doc) return;
    if (doc?.suspended) return;

    await queue(Priority.RELAY, async () => {
        const channel = await db.channels.findOne({ id });
        if (!channel) return;
        if (channel.panic) return;
        if (channel.bans.includes(message.author.id)) return await message.delete().catch();

        const source = await db.connections.findOne({ id, guild: message.guild!.id });
        if (!source) return;
        if (source.bans.includes(message.author.id)) return await message.delete().catch();

        if (message.flags.has("SuppressNotifications")) return;
        if (![MessageType.ChatInputCommand, MessageType.ContextMenuCommand, MessageType.Default, MessageType.Reply].includes(message.type)) return;

        const connections = await db.connections.find({ id, guild: { $ne: message.guildId! }, suspended: false, bans: { $ne: message.author.id } }).toArray();

        const messages = await Promise.all(
            connections.map(async (connection) => {
                try {
                    const { channel: id, showServers, showTag } = connection;

                    const output = await bot.channels.fetch(id);
                    if (output?.type !== ChannelType.GuildText) return;

                    const webhook = await getWebhook(output);
                    if (!webhook) return;

                    return await webhook.send(
                        await addProfile(await constructMessage(message, connection), message.member ?? message.author, message.guild, showServers, showTag),
                    );
                } catch (error) {
                    logger.error(error, "eb4afe59-fbc5-48b4-bc2d-af991ef04679");
                }
            }),
        );

        await db.messages.insertOne({
            id,
            author: message.author.id,
            channel: message.channelId,
            message: message.id,
            instances: messages.filter((x) => x).map((x) => ({ channel: x!.channelId, message: x!.id })),
        });
    });
});
