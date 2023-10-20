import { ButtonInteraction } from "discord.js";
import db from "../db.js";
import { log } from "../utils.js";

export default async function (button: ButtonInteraction, id: number) {
    await button.deferUpdate();

    const doc = await db.channels.findOneAndDelete({ id });
    if (!doc) throw "That global channel does not exist anymore.";

    const { deletedCount: deletedConnections } = await db.connections.deleteMany({ id });
    const { deletedCount: deletedMessages } = await db.messages.deleteMany({ id });

    const text = `eleted "${doc.name}".\n- ${deletedConnections} connection${deletedConnections === 1 ? "" : "s"} deleted\n- ${deletedMessages} message${
        deletedMessages === 1 ? "" : "s"
    } deleted`;

    await log(doc, `${button.user} d${text}`);
    return `D${text}`;
}
