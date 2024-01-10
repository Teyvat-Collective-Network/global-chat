import { ButtonInteraction, TextChannel } from "discord.js";
import broadcast, { formatObject, formatUser } from "../broadcast.js";
import db from "../db.js";
import logger from "../logger.js";
import { assertAdmin } from "../permissions.js";
import { getConnection, log } from "../utils.js";

export default async function (button: ButtonInteraction) {
    await button.deferUpdate();

    await assertAdmin(button);

    const id = await getConnection(button.channelId);
    await db.connections.deleteOne({ id, guild: button.guildId! });

    const doc = await db.channels.findOne({ id });

    await log(doc!, `${button.user} disconnected ${button.channel} from ${doc!.name}`);
    logger.info({ user: button.user.id, channel: id, target: button.channelId }, "f6c31f27-7378-4b76-9d13-e98c3049e34f Connection destroyed");
    await broadcast("Disconnected", `${formatUser(button.user)} disconnected ${formatObject(button.channel! as TextChannel)} from ${doc!.name}`);
    return `This server has been disconnected from ${doc!.name}.`;
}
