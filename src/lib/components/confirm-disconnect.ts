import { ButtonInteraction } from "discord.js";
import db from "../db.js";
import { assertAdmin } from "../permissions.js";
import { getConnection, log } from "../utils.js";

export default async function (button: ButtonInteraction) {
    await button.deferUpdate();

    await assertAdmin(button);

    const id = await getConnection(button.channelId);
    await db.connections.deleteOne({ id, guild: button.guildId! });

    const doc = await db.channels.findOne({ id });

    await log(doc!, `${button.user} disconnected ${button.channel} from ${doc!.name}`);
    return `This server has been disconnected from ${doc!.name}.`;
}
