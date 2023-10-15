import { ChatInputCommandInteraction } from "discord.js";
import db from "../../db.js";
import { assertAdmin } from "../../permissions.js";
import { getConnection, log } from "../../utils.js";

export default async function (cmd: ChatInputCommandInteraction) {
    await cmd.deferReply({ ephemeral: true });
    await assertAdmin(cmd);

    const id = await getConnection(cmd.channelId);
    const doc = await db.channels.findOne({ id });

    const conn = await db.connections.findOneAndUpdate({ channel: cmd.channelId }, { $set: { suspended: true } });
    if (conn!.suspended) throw "This connection is already suspended.";

    await log(doc!, `${cmd.user} suspended the connection for ${doc!.name} in ${cmd.guild!.name} (${cmd.channel})`);
    return "This connection has been suspended. Messages will not be relayed in or out. Edits and deletions will still be copied. Use `/global connection unsuspend` to resume the connection.";
}
