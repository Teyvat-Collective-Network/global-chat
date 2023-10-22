import { ChannelType, Events } from "discord.js";
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
        await relayDelete(doc);

        const [toLog] = await constructMessages(message, [{ replyStyle: "text", showServers: true, showTag: true, noReply: true }]);
        toLog.content = `**[deleted]** ${toLog.content ?? ""}`.slice(0, 2000);

        const channel = await bot.channels.fetch(doc.channel).catch(() => {});
        const guild = channel && "guild" in channel ? channel.guild : null;

        const user = (guild && (await guild.members.fetch(doc.author).catch(() => {}))) ?? (await bot.users.fetch(doc.author).catch(() => {}));

        await log(doc.id, await addProfile(toLog, user, guild, true, true));
    }
});
