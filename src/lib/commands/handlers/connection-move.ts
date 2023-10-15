import { ChatInputCommandInteraction, TextChannel } from "discord.js";
import db from "../../db.js";
import { assertAdmin, assertRelayChannelPermissions } from "../../permissions.js";
import { getConnection } from "../../utils.js";

export default async function (cmd: ChatInputCommandInteraction, channel: TextChannel) {
    await cmd.deferReply({ ephemeral: true });
    await assertAdmin(cmd);

    await assertRelayChannelPermissions(channel);

    const id = await getConnection(cmd.channelId);

    const doc = await db.channels.findOne({ id });
    await db.connections.updateOne({ id, guild: cmd.guildId! }, { $set: { channel: channel.id } });

    return `The connection for ${doc!.name} in this server has been moved to ${channel}.`;
}
