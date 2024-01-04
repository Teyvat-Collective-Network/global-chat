import { ChatInputCommandInteraction, MessageContextMenuCommandInteraction } from "discord.js";
import bot from "../../bot.js";
import db from "../../db.js";
import logger from "../../logger.js";

export default async function (cmd: ChatInputCommandInteraction | MessageContextMenuCommandInteraction, message: string) {
    await cmd.deferReply({ ephemeral: true });

    if (!message.match(/^\d+$/)) throw "That is not a valid Discord message ID.";

    const doc = await db.messages.findOne({ $or: [{ message }, { instances: { $elemMatch: { message } } }, { logs: { $elemMatch: { message } } }] });
    if (!doc) throw "That is not a global chat message.";

    const user = await bot.users.fetch(doc.author).catch(() => {});

    logger.info({ user: cmd.user.id, channel: cmd.channel!.id, message, author: doc.author }, "43b84ea3-2199-4e62-80a0-66c8af3a5d59 Fetched author");
    return `That message was sent by ${user} (${user?.tag}).`;
}
