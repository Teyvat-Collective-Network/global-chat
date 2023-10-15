import { diffWords } from "diff";
import { ChannelType, Events, MessageType } from "discord.js";
import bot from "../../bot.js";
import db from "../../db.js";
import logger from "../../logger.js";
import Priority from "../../priority.js";
import queue from "../../queue.js";
import { addProfile, constructMessage, log } from "../../utils.js";

const regex = { escape: /(?<!\\)((?:\\\\)*)([\[\]\(\)*~_`])/, trim: /^(\s*)(.*?)(\s*)$/ };

bot.on(Events.MessageUpdate, async (before, _message) => {
    const message = await _message.fetch();

    if (message.channel.type !== ChannelType.GuildText) return;
    if (message.webhookId && message.type !== MessageType.ChatInputCommand && message.type !== MessageType.ContextMenuCommand) return;
    if (message.flags.has("SuppressNotifications")) return;

    const doc = await db.messages.findOne({ channel: message.channelId, message: message.id });
    if (!doc) return;

    await queue(Priority.EDIT, async () => {
        const channel = await db.channels.findOne({ id: doc.id });
        if (!channel) return;
        if (channel.bans.includes(message.author.id)) return;

        const source = await db.connections.findOne({ id: doc.id, guild: message.guildId! });
        if (!source) return;
        if (source.bans.includes(message.author.id)) return;

        const connections = await db.connections.find({ id: doc.id, guild: { $ne: message.guildId! }, bans: { $ne: message.author.id } }).toArray();

        await Promise.all(
            doc.instances.map(async (instance) => {
                try {
                    const connection = connections.find((x) => x.channel === instance.channel);
                    if (!connection) return;

                    const channel = await bot.channels.fetch(instance.channel);
                    if (channel?.type !== ChannelType.GuildText) return;

                    const linked = await channel.messages.fetch(instance.message).catch();
                    if (!linked) return;

                    const webhook = await linked.fetchWebhook();
                    await webhook.editMessage(linked, await constructMessage(message, connection));
                } catch (error) {
                    logger.error(error, "8867017e-c5da-4f3a-8c3c-ee50295a0fb2");
                }
            }),
        );

        const diff = diffWords(before.content || "", message.content || "")
            .map((res) => {
                const out = res.value;

                if (res.added) return out.replace(regex.escape, "$1\\$2").replace(regex.trim, "$1**$2**$3");
                if (res.removed) return out.replace(regex.escape, "$1\\$2").replace(regex.trim, "$1~~$2~~$3");

                return (out.length > 32 ? `${out.slice(0, 16)}...${out.slice(-16)}` : out).replace(regex.escape, "$1\\$2");
            })
            .join("");

        if (diff) await log(doc.id, await addProfile({ content: diff }, message.member ?? message.author, message.guild, true, true));
    });
});
