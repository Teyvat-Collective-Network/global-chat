import { ChatInputCommandInteraction } from "discord.js";
import db from "../../db.js";
import logger from "../../logger.js";
import { assertLocalBan } from "../../permissions.js";
import { confirm } from "../../responses.js";
import { getConnection } from "../../utils.js";

export default async function (cmd: ChatInputCommandInteraction) {
    await cmd.deferReply({ ephemeral: true });
    await assertLocalBan(cmd);

    const id = await getConnection(cmd.channelId);
    const doc = await db.channels.findOne({ id });

    logger.info(
        { user: cmd.user.id, guild: cmd.guild!.id, channel: id, ...(doc!.panic ? { error: "Channel already in panic" } : {}) },
        "Panic initiated (not confirmed)",
    );

    if (doc!.panic) throw "This channel is already in lockdown.";

    return confirm(
        "panic",
        `Are you sure you want to put ${
            doc!.name
        } into panic mode / lockdown? This will disable message relaying globally. Edits and deletion will still go through as usual. This will alert all global mods and observers and can only be reverted by one of them.`,
    );
}
