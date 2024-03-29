import { ChatInputCommandInteraction, TextChannel } from "discord.js";
import broadcast, { formatObject, formatUser } from "../../broadcast.js";
import db from "../../db.js";
import logger from "../../logger.js";
import { assertAdmin, assertRelayChannelPermissions } from "../../permissions.js";
import { getConnection } from "../../utils.js";

export default async function (cmd: ChatInputCommandInteraction, channel: TextChannel) {
    await cmd.deferReply({ ephemeral: true });
    await assertAdmin(cmd);

    await assertRelayChannelPermissions(channel);

    const id = await getConnection(cmd.channelId);

    const doc = await db.channels.findOne({ id });
    await db.connections.updateOne({ id, guild: cmd.guildId! }, { $set: { channel: channel.id } });

    logger.info({ user: cmd.user.id, guild: cmd.guildId, old: cmd.channelId, new: channel.id }, "f909c5cf-d8cd-4d96-b804-775ddbacf15e Connection moved");

    await broadcast(
        "Connection Moved",
        `${formatUser(cmd.user)} moved the connection in ${formatObject(cmd.guild!)} from ${formatObject(cmd.channel! as any)} to ${formatObject(channel)}`,
    );

    return `The connection for ${doc!.name} in this server has been moved to ${channel}.`;
}
