import { ChatInputCommandInteraction, User } from "discord.js";
import db from "../../db.js";
import { assertObserver } from "../../permissions.js";
import { getConnection, log } from "../../utils.js";
import logger from "../../logger.js";

export default async function (cmd: ChatInputCommandInteraction, user: User, id: number | null) {
    await cmd.deferReply({ ephemeral: true });
    await assertObserver(cmd.user);

    id = await getConnection(cmd.channelId, id);
    const doc = await db.channels.findOneAndUpdate({ id }, { $addToSet: { mods: user.id } });

    if (doc!.mods.includes(user.id)) throw `${user} is already a moderator of ${doc!.name}.`;

    await log(doc!, `${cmd.user} promoted ${user} to moderator in ${doc!.name}`);
    logger.info({ executor: cmd.user.id, channel: id, user: user.id }, "d43ab00f-9835-41eb-8e01-e85afb1a79d6 Mod promoted");
    return `${user} is now a moderator of ${doc!.name}`;
}
