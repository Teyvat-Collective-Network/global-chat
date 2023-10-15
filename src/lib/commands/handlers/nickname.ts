import { ChatInputCommandInteraction } from "discord.js";
import db from "../../db.js";

export default async function (cmd: ChatInputCommandInteraction, nickname: string | null) {
    await db.users.updateOne({ id: cmd.user.id }, { $set: { nickname } }, { upsert: true });

    return nickname
        ? `Your global chat nickname has been set to ${nickname}.`
        : "Your global chat nickname has been cleared and messages you send will use your server nickname, display name, or tag.";
}
