import { ChannelType, Message } from "discord.js";
import { WithId } from "mongodb";
import bot from "./bot.js";
import db from "./db.js";
import logger from "./logger.js";
import Priority from "./priority.js";
import queue from "./queue.js";
import { GlobalChannel, GlobalMessage } from "./types.js";
import { addProfile, constructMessage, log } from "./utils.js";

export async function maybeFilter(channel: GlobalChannel, message: Message) {
    if (channel.ignoreFilter || !message.content) return false;

    const filters = await db.filter.find().toArray();

    let match: string | undefined;

    for (const filter of filters) {
        match = message.content.match(new RegExp(filter.match))?.[0];
        if (match) break;
    }

    if (!match) return false;

    const toLog = await constructMessage(message, { replyStyle: "text", showServers: true, showTag: true, noReply: true });
    toLog.content = `**[blocked]** ${toLog.content ?? ""}`.slice(0, 2000);
    toLog.embeds = [{ title: "Blocked Term", description: match, color: 0x2b2d31 }, ...(toLog.embeds ?? [])].slice(0, 10);

    await log(channel, await addProfile(toLog, message.member ?? message.author, message.guild!, true, true));
    await message.delete().catch(() => {});
    return true;
}

export async function relayDelete(doc: WithId<GlobalMessage>, doLog: boolean = false) {
    await queue(Priority.DELETE, async () => {
        await db.messages.updateOne({ _id: doc._id }, { $set: { deleted: true } });
        const connections = await db.connections.find({ id: doc.id }).toArray();

        let copy: Message | undefined | null;

        await Promise.all(
            [...doc.instances, doc].map(async (instance) => {
                try {
                    const connection = connections.find((x) => x.channel === instance.channel);
                    if (!connection) return;

                    const channel = await bot.channels.fetch(instance.channel);
                    if (channel?.type !== ChannelType.GuildText) return;

                    let linked: Message | undefined | null;

                    if (doLog && !copy) {
                        linked = (await channel.messages.fetch(instance.message).catch(() => {})) ?? null;
                        copy = linked;
                    }

                    try {
                        await channel.messages.delete(instance.message);
                        return;
                    } catch {}

                    if (linked === undefined) linked = await channel.messages.fetch(instance.message).catch(() => {});
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

        if (doLog && copy) {
            const toLog = await constructMessage(copy, { replyStyle: "text", showServers: true, showTag: true, noReply: true });
            toLog.content = `**[deleted]** ${toLog.content ?? ""}`.slice(0, 2000);

            const channel = await bot.channels.fetch(doc.channel).catch(() => {});
            const guild = channel && "guild" in channel ? channel.guild : null;

            const user = (guild && (await guild.members.fetch(doc.author).catch(() => {}))) ?? (await bot.users.fetch(doc.author).catch(() => {}));

            await log(doc.id, await addProfile(toLog, user, guild, true, true));
        }
    });
}
