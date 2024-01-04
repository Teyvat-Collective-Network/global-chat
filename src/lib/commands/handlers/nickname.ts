import { ChatInputCommandInteraction } from "discord.js";
import db from "../../db.js";
import logger from "../../logger.js";

export default async function (cmd: ChatInputCommandInteraction, nickname: string | null) {
    await db.users.updateOne({ id: cmd.user.id }, { $set: { nickname } }, { upsert: true });

    logger.info({ user: cmd.user.id, nickname }, "05fbbeb2-3df1-44a4-a3e3-260a8c8a0949 Nickname updated");

    return nickname
        ? `Your global chat nickname has been set to ${nickname}.`
        : "Your global chat nickname has been cleared and messages you send will use your server nickname, display name, or tag.";
}
