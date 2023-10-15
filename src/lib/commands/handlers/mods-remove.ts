import { ChatInputCommandInteraction, User } from "discord.js";
import db from "../../db.js";
import { assertObserver } from "../../permissions.js";
import { getConnection, log } from "../../utils.js";

export default async function (cmd: ChatInputCommandInteraction, user: User, id: number | null) {
    await cmd.deferReply({ ephemeral: true });
    await assertObserver(cmd.user);

    id = await getConnection(cmd.channelId, id);
    const doc = await db.channels.findOneAndUpdate({ id }, { $pull: { mods: user.id } });

    if (!doc!.mods.includes(user.id)) throw `${user} is not a moderator of ${doc!.name}.`;

    await log(doc!, `${cmd.user} removed ${user} as a moderator from ${doc!.name}`);
    return `${user} is no longer a moderator of ${doc!.name}`;
}
