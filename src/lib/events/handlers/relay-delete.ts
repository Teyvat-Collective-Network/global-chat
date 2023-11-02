import { ChannelType, Events, Message } from "discord.js";
import { relayDelete } from "../../actions.js";
import bot from "../../bot.js";
import db from "../../db.js";
import { addProfile, constructMessages, log } from "../../utils.js";

bot.on(Events.MessageDelete, async (message) => {
    if (message.channel.type !== ChannelType.GuildText) return;
    if (message.flags.has("SuppressNotifications")) return;

    const doc = await db.messages.findOne({
        $or: [{ channel: message.channelId, message: message.id }, { instances: { channel: message.channelId, message: message.id } }],
    });

    if (doc && !doc.deleted) {
        let copy: Message | undefined;

        if (message.partial)
            for (const obj of [doc, ...doc.instances])
                try {
                    const channel = await bot.channels.fetch(obj.channel);
                    if (channel?.type === ChannelType.GuildText) copy = await channel.messages.fetch(obj.message);
                    if (copy) break;
                } catch {}

        await relayDelete(doc);

        const [toLog] = await constructMessages(message, [{ replyStyle: "text", showServers: true, showTag: true, noReply: true }]);
        toLog.content = `**[deleted]** ${copy?.content ?? toLog.content ?? ""}`.slice(0, 2000);

        const channel = await bot.channels.fetch(doc.channel).catch(() => {});
        const guild = channel && "guild" in channel ? channel.guild : null;

        const user = (guild && (await guild.members.fetch(doc.author).catch(() => {}))) ?? (await bot.users.fetch(doc.author).catch(() => {}));

        const logged = await log(doc.id, await addProfile(toLog, user, guild, true, true));
        if (logged) await db.messages.updateOne({ _id: doc._id }, { $push: { logs: { channel: logged.channelId, message: logged.id } } });
    }
});
