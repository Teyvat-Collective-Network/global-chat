import { ChatInputCommandInteraction } from "discord.js";
import db from "../../db.js";
import { assertAdmin } from "../../permissions.js";
import { getConnection } from "../../utils.js";

export default async function (cmd: ChatInputCommandInteraction, replyStyle: string | null, showServers: boolean | null, showTag: boolean | null) {
    await cmd.deferReply({ ephemeral: true });

    await assertAdmin(cmd);

    const id = await getConnection(cmd.channelId);
    const doc = await db.channels.findOne({ id });

    await db.connections.updateOne(
        { channel: cmd.channelId },
        {
            $set: {
                replyStyle: (replyStyle as any) ?? undefined,
                showServers: showServers ?? undefined,
                showTag: showTag ?? undefined,
            },
        },
    );

    return "Your edits have been saved.";
}
