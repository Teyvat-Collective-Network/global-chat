import { ChatInputCommandInteraction, MessageContextMenuCommandInteraction } from "discord.js";
import bot from "../../bot.js";
import db from "../../db.js";

export default async function (cmd: ChatInputCommandInteraction | MessageContextMenuCommandInteraction, message: string) {
    await cmd.deferReply({ ephemeral: true });

    if (!message.match(/^\d+$/)) throw "That is not a valid Discord message ID.";

    const doc = await db.messages.findOne({ $or: [{ message }, { instances: { $elemMatch: { message } } }] });
    if (!doc) throw "That is not a global chat message.";

    const user = await bot.users.fetch(doc.author).catch();

    return `That message was sent by ${user} (${user.tag}).`;
}
