import { ChannelType, ChatInputCommandInteraction } from "discord.js";
import broadcast, { formatObject, formatUser } from "../../broadcast.js";
import db from "../../db.js";
import logger from "../../logger.js";
import { assertAdmin, assertRelayChannelPermissions, assertTCN, assertUnused } from "../../permissions.js";
import { log } from "../../utils.js";

export default async function (cmd: ChatInputCommandInteraction, id: number, replyStyle: string | null, showServers: boolean | null, showTag: boolean | null) {
    await cmd.deferReply({ ephemeral: true });
    await assertTCN(cmd, true);

    await assertAdmin(cmd);

    if (cmd.channel?.type !== ChannelType.GuildText) throw "Only guild text channels may be connected.";
    await assertRelayChannelPermissions(cmd.channel);

    const channel = await db.channels.findOne({ id: id });
    if (!channel) throw "Error. Location: `[f1c80c7c-7164-4bd4-9802-2d7a5d015444]`";

    const doc = await db.connections.findOne({ id, guild: cmd.guildId! });
    if (doc) throw `This server is already connected to ${channel.name} in <#${doc.channel}>.`;

    await assertUnused(cmd.channel!);

    await db.connections.insertOne({
        id,
        guild: cmd.guildId!,
        channel: cmd.channelId,
        replyStyle: (replyStyle ?? "text") as any,
        showTag: showTag ?? false,
        showServers: showServers ?? true,
        suspended: false,
        bans: [],
    });

    await log(channel, `${cmd.user} connected ${cmd.channel} to ${channel.name}.`);
    logger.info({ user: cmd.user.id, channel: id, connection: cmd.channel.id }, "92b9f1c3-ecf5-480b-91f3-02c6efd91272 Connection created");
    await broadcast("Connection Created", `${formatUser(cmd.user)} connected ${formatObject(cmd.channel)} to ${channel.name}`);
    return `${cmd.channel} is now connected to ${channel.name}!`;
}
