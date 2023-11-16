import { ChatInputCommandInteraction, User } from "discord.js";
import db from "../../db.js";
import { assertLocalBan, assertMod } from "../../permissions.js";
import { getConnection, log } from "../../utils.js";

export default async function (cmd: ChatInputCommandInteraction, user: User, id: number | null, local: boolean | null) {
    await cmd.deferReply({ ephemeral: true });

    id = await getConnection(cmd.channelId, id);
    const channel = await db.channels.findOne({ id });

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
