import { ChatInputCommandInteraction } from "discord.js";
import broadcast, { formatUser } from "../../broadcast.js";
import db from "../../db.js";
import logger from "../../logger.js";
import { assertObserver } from "../../permissions.js";
import { getConnection, log } from "../../utils.js";

export default async function (cmd: ChatInputCommandInteraction) {
    await cmd.deferReply({ ephemeral: true });
    await assertObserver(cmd.user);

    const id = await getConnection(cmd.channelId);
    const doc = await db.channels.findOneAndUpdate({ id }, { $set: { panic: false } });

    if (!doc!.panic) throw "This channel is not in lockdown.";

    await log(doc!, `${cmd.user} disabled panic mode for ${doc!.name}.`);
    logger.info({ user: cmd.user.id, channel: id }, "f7f1f502-7d9a-43c7-bbd0-f55936aa29bf Panic removed");
    await broadcast("Panic Removed", `${formatUser(cmd.user)} removed panic mode on ${doc!.name}`);
    return `${doc!.name} has been taken out of panic mode / lockdown.`;
}
