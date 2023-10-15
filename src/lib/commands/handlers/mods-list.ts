import { ChatInputCommandInteraction } from "discord.js";
import db from "../../db.js";
import { assertObserver } from "../../permissions.js";
import { embed } from "../../responses.js";
import { getConnection } from "../../utils.js";

export default async function (cmd: ChatInputCommandInteraction, id: number | null) {
    await cmd.deferReply({ ephemeral: true });
    await assertObserver(cmd.user);

    id = await getConnection(cmd.channelId, id);
    const doc = await db.channels.findOne({ id });
    if (!doc) throw "Error. Location: `[5d44c81e-63f1-4f7a-82c3-80821d06557a]`";

    return embed({
        title: `${doc.name}'s Moderators`,
        description: `${doc.mods.map((x) => `- <@${x}>`).join("\n")}\n- all observers`,
    });
}
