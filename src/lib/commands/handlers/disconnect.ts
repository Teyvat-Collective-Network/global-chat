import { ChatInputCommandInteraction } from "discord.js";
import db from "../../db.js";
import logger from "../../logger.js";
import { assertAdmin } from "../../permissions.js";
import { confirm } from "../../responses.js";
import { getConnection } from "../../utils.js";

export default async function (cmd: ChatInputCommandInteraction) {
    await cmd.deferReply({ ephemeral: true });
    await assertAdmin(cmd);

    const id = await getConnection(cmd.channelId);
    const doc = await db.channels.findOne({ id });

    logger.info({ user: cmd.user.id, guild: cmd.guild!.id, channel: id }, "90e0695b-8d26-41b3-b61f-4adf45f185c9 Disconnect initiated (not confirmed)");

    return confirm(
        "disconnect",
        `Are you sure you want to disconnect this server from ${
            doc!.name
        }? This will irreversibly erase all data, including customizations, settings, and bans. If you want to use a different channel, use \`/global connection move\`. If you want to temporarily pause the connection, use \`/global connection suspend\`.`,
    );
}
