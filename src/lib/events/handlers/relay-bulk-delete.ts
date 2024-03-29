import { ChannelType, Events, Message, TextChannel } from "discord.js";
import bot from "../../bot.js";
import broadcast, { formatObject } from "../../broadcast.js";
import db from "../../db.js";
import logger from "../../logger.js";
import Priority from "../../priority.js";
import queue from "../../queue.js";
import { GlobalMessage } from "../../types.js";
import { log } from "../../utils.js";

bot.on(Events.MessageBulkDelete, async (messages) => {
    if (messages.size === 0) return;
    if (messages.first()!.channel.type !== ChannelType.GuildText) return;

    messages = messages.filter((x) => !x.flags.has("SuppressNotifications"));
    const ids = messages.map((x) => x.id);

    if (ids.length === 0) return;

    logger.info(
        { count: ids.length, origin: messages.first()!.guild!.id, channel: messages.first()!.channel.id, ids },
        "f18b4981-6b76-4b28-91b6-103ff41eac96 Received bulk delete",
    );

    await broadcast(
        "Received Bulk Delete",
        `A bulk delete was received from ${formatObject(messages.first()!.guild!)} in ${formatObject(messages.first()!.channel! as TextChannel)}`,
        `IDs: ${ids.map((id) => `<code>${id}</code>`).join(" ")}`,
    );

    const docs = await db.messages
        .find({
            $and: [
                { deleted: { $ne: true } },
                {
                    $or: [
                        { channel: messages.first()!.channelId, message: { $in: ids } },
                        { "instances.channel": messages.first()!.channelId, "instances.message": { $in: ids } },
                    ],
                },
            ],
        })
        .toArray();

    if (docs.length === 0) return;

    await db.messages.updateMany({ _id: { $in: docs.map((x) => x._id) } }, { $set: { deleted: true } });

    const groups: Record<number, GlobalMessage[]> = {};

    for (const doc of docs) (groups[doc.id] ??= []).push(doc);

    logger.info({ messages: docs.map((doc) => doc.message), origin: messages.first()!.guild!.id });

    for (const [id, group] of Object.entries(groups))
        await queue(Priority.DELETE, async () => {
            const connections = await db.connections.find({ id: +id, guild: { $ne: messages.first()!.guildId! } }).toArray();
            if (connections.length === 0) return;

            const blocks: Record<string, string[]> = {};
            const idmap: Record<string, string> = {};
            const copies: Record<string, Message | undefined> = {};

            for (const doc of group) {
                (blocks[doc.channel] ??= []).push(doc.message);
                idmap[doc.message] = doc.message;

                for (const instance of doc.instances) {
                    (blocks[instance.channel] ??= []).push(instance.message);
                    idmap[instance.message] = doc.message;
                }
            }

            await Promise.all(
                Object.entries(blocks).map(async ([channelId, ids]) => {
                    try {
                        const connection = connections.find((x) => x.channel === channelId);
                        if (!connection) return;

                        const channel = await bot.channels.fetch(channelId);
                        if (channel?.type !== ChannelType.GuildText) return;

                        try {
                            const deleted = await channel.bulkDelete(ids);
                            deleted.forEach((x, i) => !x?.partial && (copies[idmap[i]] ??= x));
                        } catch {
                            const linked = await Promise.all(ids.map((id) => channel.messages.fetch(id).catch(() => {})));
                            linked.forEach((x, i) => x && (copies[idmap[ids[i]]] ??= x));
                            await Promise.all(linked.map((x) => x?.delete().catch((error) => logger.error(error, "472a602f-a5f3-41c4-8f8b-e9caedfd3a83"))));
                        }

                        logger.info({ guild: channel.guild!.id, connection: channel.id }, "cf76dd58-7a2b-4e63-af2c-0d99d444dd3a Purged messages");
                    } catch (error) {
                        logger.error(error, "893fbfa6-2f97-46cf-b49d-ac21238785c0");
                    }
                }),
            );

            await log(+id, {
                content: "**Bulk-deleted messages:**",
                files: [{ attachment: Buffer.from(JSON.stringify(copies, undefined, 4)), name: "dump.json" }],
            });
        });
});
