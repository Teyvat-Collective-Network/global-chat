import { ChatInputCommandInteraction } from "discord.js";
import db from "../../db.js";
import { assertAdmin } from "../../permissions.js";
import { confirm } from "../../responses.js";
import { getConnection } from "../../utils.js";

export default async function (cmd: ChatInputCommandInteraction) {
    await cmd.deferReply({ ephemeral: true });
    await assertAdmin(cmd);

    const id = await getConnection(cmd.channelId);
    const doc = await db.channels.findOne({ id });

    return confirm(
        "disconnect",
        `Are you sure you want to disconnect this server from ${doc!.name}? This will irreversibly erase all data, including customizations, settings, and bans. If you want to use a different channel, use \`/global connection move\`. If you want to temporarily pause the connection, use \`/global connection suspend\`.`,
    );
}
