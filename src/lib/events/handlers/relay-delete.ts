import { ChannelType, Events } from "discord.js";
import { relayDelete } from "../../actions.js";
import bot from "../../bot.js";
import db from "../../db.js";

bot.on(Events.MessageDelete, async (message) => {
    if (message.channel.type !== ChannelType.GuildText) return;
    if (message.flags.has("SuppressNotifications")) return;

    const doc = await db.messages.findOne({
        $or: [{ channel: message.channelId, message: message.id }, { instances: { channel: message.channelId, message: message.id } }],
    });

    if (doc) await relayDelete(doc);
});
