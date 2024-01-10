import { ButtonInteraction } from "discord.js";
import broadcast, { formatUser } from "../broadcast.js";
import db from "../db.js";
import logger from "../logger.js";
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
    logger.info({ user: button.user.id, name: doc.name, deletedConnections, deletedMessages }, "cc88234a-8497-4516-bab9-3bf6870de8ac Global channel deleted");
    await broadcast("Channel Deleted", `${formatUser(button.user)} deleted ${doc.name}`);
    return `D${text}`;
}
