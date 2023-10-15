import { ChannelType } from "discord.js";
import { WithId } from "mongodb";
import bot from "./bot.js";
import db from "./db.js";
import logger from "./logger.js";
import Priority from "./priority.js";
import queue from "./queue.js";
import { GlobalMessage } from "./types.js";

export async function relayDelete(doc: WithId<GlobalMessage>) {
    await queue(Priority.DELETE, async () => {
        const connections = await db.connections.find({ id: doc.id }).toArray();

        await Promise.all(
            [...doc.instances, doc].map(async (instance) => {
                try {
                    const connection = connections.find((x) => x.channel === instance.channel);
                    if (!connection) return;

                    const channel = await bot.channels.fetch(instance.channel);
                    if (channel?.type !== ChannelType.GuildText) return;

                    try {
                        await channel.messages.delete(instance.message);
                        return;
                    } catch {}

                    const linked = await channel.messages.fetch(instance.message).catch();
                    if (!linked) return;

                    if (linked.webhookId) {
                        const webhook = await linked.fetchWebhook();
                        await webhook.deleteMessage(linked);
                    } else await linked.delete();
                } catch (error) {
                    logger.error(error, "06d8e858-2469-49f8-bf84-818ada13bb81");
                }
            }),
        );
    });
}
