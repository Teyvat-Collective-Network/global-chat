import { ChatInputCommandInteraction } from "discord.js";
import db from "../../db.js";
import { assertAdmin } from "../../permissions.js";

export default async function (cmd: ChatInputCommandInteraction, replyStyle: string | null, showServers: boolean | null, showTag: boolean | null) {
    await cmd.deferReply({ ephemeral: true });
    await assertAdmin(cmd);

    const $set: any = {};

    if (replyStyle !== null) $set.replyStyle = replyStyle;
    if (showServers !== null) $set.showServers = showServers;
    if (showTag !== null) $set.showTag = showTag;

    await db.connections.updateOne({ channel: cmd.channelId }, { $set });

    return "Your edits have been saved.";
}
