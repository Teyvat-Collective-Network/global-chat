import { ChatInputCommandInteraction } from "discord.js";
import db from "../../db.js";
import { assertAdmin } from "../../permissions.js";
import { getConnection, log } from "../../utils.js";

export default async function (cmd: ChatInputCommandInteraction) {
    await cmd.deferReply({ ephemeral: true });
    await assertAdmin(cmd);

    const id = await getConnection(cmd.channelId);
    const doc = await db.channels.findOne({ id });

    const conn = await db.connections.findOneAndUpdate({ channel: cmd.channelId }, { $set: { suspended: false } });
    if (!conn!.suspended) throw "This connection is not suspended.";

    await log(doc!, `${cmd.user} resumed the connection for ${doc!.name} in ${cmd.guild!.name} (${cmd.channel})`);
    return "This connection has been resumed. Messages will be relayed in and out.";
}
