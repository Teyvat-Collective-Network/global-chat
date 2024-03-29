import { escapeHTML } from "bun";
import { ChatInputCommandInteraction, User } from "discord.js";
import broadcast, { formatObject, formatUser } from "../../broadcast.js";
import db from "../../db.js";
import logger from "../../logger.js";
import { assertLocalBan, assertMod } from "../../permissions.js";
import { getConnection, log } from "../../utils.js";

export default async function (cmd: ChatInputCommandInteraction, user: User, id: number | null, local: boolean | null) {
    await cmd.deferReply({ ephemeral: true });

    id = await getConnection(cmd.channelId, id);
    const channel = await db.channels.findOne({ id });

    logger.info(
        { executor: cmd.user.id, target: user.id, channel: id },
        "7d0ed965-1117-4199-913b-bac7de7cdd73 Global unban called (this does not mean it worked)",
    );

    await broadcast(
        "Unban initiated (does not mean it worked)",
        `${formatUser(cmd.user)} unbanned ${formatUser(user)} in ${escapeHTML(channel?.name ?? "Unknown Channel")} from ${formatObject(cmd.guild!)} ${
            local ? "locally" : "globally"
        }`,
    );

    if (local) {
        await assertLocalBan(cmd);

        if (cmd.user.id === user.id) throw "You cannot unban yourself.";

        const doc = await db.connections.findOneAndUpdate({ id, guild: cmd.guildId! }, { $pull: { bans: user.id } });
        if (!doc) throw `This server is not connected to ${channel!.name}, so you cannot unban the user locally.`;
        if (!doc.bans.includes(user.id)) throw `${user} is not banned from ${channel!.name} in this server.`;

        await log(channel!, `${cmd.user} unbanned ${user} from ${channel!.name} in this server.`);

        return `${user} has been unbanned from ${channel!.name} in this server (does not override global bans).`;
    } else {
        if (channel!.plugins?.includes("local-mods-can-ban")) await assertLocalBan(cmd);
        else await assertMod(cmd.user, id);

        if (cmd.user.id === user.id) throw "You cannot unban yourself.";

        const doc = await db.channels.findOneAndUpdate({ id }, { $pull: { bans: user.id } });
        if (!doc!.bans.includes(user.id)) throw `${user} is not banned from ${channel!.name} everywhere.`;

        await log(channel!, `${cmd.user} unbanned ${user} from ${channel!.name}`);
        return `${user} has been unbanned from ${channel!.name} everywhere (does not override local bans).`;
    }
}
