import { ChatInputCommandInteraction, MessageContextMenuCommandInteraction, PermissionsBitField } from "discord.js";
import { relayDelete } from "../../actions.js";
import db from "../../db.js";
import { assertMod } from "../../permissions.js";
import { getConnection } from "../../utils.js";

export default async function (cmd: ChatInputCommandInteraction | MessageContextMenuCommandInteraction, message: string) {
    await cmd.deferReply({ ephemeral: true });

    const channel = cmd.channelId;
    const id = await getConnection(channel);

    if (!message.match(/^\d+$/)) throw "That is not a valid Discord message ID.";

    if (!cmd.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages))
        await assertMod(cmd.user, id).catch(() => {
            throw "You must have permission to delete messages in this channel or be a global moderator of this channel.";
        });

    const doc = await db.messages.findOne({ $or: [{ channel, message }, { instances: { channel, message } }] });
    if (!doc) throw "That message is not in the system. It may not have been forwarded in the first place.";

    await relayDelete(doc);

    return "Queued deletion. This action will resolve in the background if it is successful.";
}
