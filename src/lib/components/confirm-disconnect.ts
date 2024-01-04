import { ButtonInteraction } from "discord.js";
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
    logger.info({ channel: id, target: button.channelId }, "f6c31f27-7378-4b76-9d13-e98c3049e34f Connection destroyed");
    return `This server has been disconnected from ${doc!.name}.`;
}
