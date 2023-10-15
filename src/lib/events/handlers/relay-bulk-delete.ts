import { ChannelType, Events } from "discord.js";
import bot from "../../bot.js";
import db from "../../db.js";
import logger from "../../logger.js";
import Priority from "../../priority.js";
import queue from "../../queue.js";
import { GlobalMessage } from "../../types.js";

bot.on(Events.MessageBulkDelete, async (messages) => {
    if (messages.size === 0) return;
    if (messages.first()!.channel.type !== ChannelType.GuildText) return;

    messages = messages.filter((x) => !x.flags.has("SuppressNotifications"));
    const ids = messages.map((x) => x.id);

    const docs = await db.messages
        .find({
            $or: [
                { channel: messages.first()!.channelId, message: { $in: ids } },
                { instance: { channel: messages.first()!.channelId, message: { $in: ids } } },
            ],
        })
        .toArray();

    if (docs.length === 0) return;

    const groups: Record<number, GlobalMessage[]> = {};

    for (const doc of docs) (groups[doc.id] ??= []).push(doc);

    for (const [id, group] of Object.entries(groups))
        await queue(Priority.DELETE, async () => {
            const connections = await db.connections.find({ id: +id, guild: { $ne: messages.first()!.guildId! } }).toArray();
            if (connections.length === 0) return;

            const blocks: Record<string, string[]> = {};

            for (const doc of group) {
                (blocks[doc.channel] ??= []).push(doc.message);
                for (const instance of doc.instances) (blocks[instance.channel] ??= []).push(instance.message);
            }

            await Promise.all(
                Object.entries(blocks).map(async ([channelId, ids]) => {
                    try {
                        const connection = connections.find((x) => x.channel === channelId);
                        if (!connection) return;

                        const channel = await bot.channels.fetch(channelId);
                        if (channel?.type !== ChannelType.GuildText) return;

                        try {
                            await channel.bulkDelete(ids);
                        } catch {
                            const linked = (await Promise.all(ids.map((id) => channel.messages.fetch(id).catch()))).filter((x) => x);
                            await Promise.all(linked.map((x) => x.delete().catch((error) => logger.error(error, "472a602f-a5f3-41c4-8f8b-e9caedfd3a83"))));
                        }
                    } catch (error) {
                        logger.error(error, "893fbfa6-2f97-46cf-b49d-ac21238785c0");
                    }
                }),
            );
        });
});
