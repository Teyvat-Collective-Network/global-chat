import { ChatInputCommandInteraction } from "discord.js";
import db from "../../db.js";
import { assertObserver } from "../../permissions.js";
import { getConnection, log } from "../../utils.js";

export default async function (cmd: ChatInputCommandInteraction) {
    await cmd.deferReply({ ephemeral: true });
    await assertObserver(cmd.user);

    const id = await getConnection(cmd.channelId);
    const doc = await db.channels.findOneAndUpdate({ id }, { $set: { panic: false } });

    if (!doc!.panic) throw "This channel is not in lockdown.";

    await log(doc!, `${cmd.user} disabled panic mode for ${doc!.name}.`);
    return `${doc!.name} has been taken out of panic mode / lockdown.`;
}
