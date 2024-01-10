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
        { executor: cmd.user.id, target: user.id, channel: id, local },
        "2dc82439-b181-45a1-becd-01310bfb21f9 Global ban called (this does not mean it worked)",
    );

    await broadcast(
        "Ban Initiated (does not mean it worked)",
        `${formatUser(cmd.user)} banned ${formatUser(user)} from ${escapeHTML(channel?.name ?? "Unknown Channel")} from ${formatObject(cmd.guild!)} ${
            local ? "locally" : "globally"
        }`,
    );

    if (local) {
        await assertLocalBan(cmd);

        if (cmd.user.id === user.id) throw "You cannot ban yourself.";

        let mod = false;

        try {
            await assertMod(user, id);
            mod = true;
        } catch {}

        if (mod) throw "You cannot ban global mods or observers. If necessary, report their behavior to an observer.";

        const doc = await db.connections.findOneAndUpdate({ id, guild: cmd.guildId! }, { $addToSet: { bans: user.id } });
        if (!doc) throw `This server is not connected to ${channel!.name}, so you cannot ban the user locally.`;
        if (doc.bans.includes(user.id)) throw `${user} is already banned from ${channel!.name} in this server.`;

        await log(channel!, `${cmd.user} banned ${user} from ${channel!.name} in this server.`);

        return `${user} has been banned from ${channel!.name} in this server.`;
    } else {
        if (channel!.plugins?.includes("local-mods-can-ban")) await assertLocalBan(cmd);
        else await assertMod(cmd.user, id);

        if (cmd.user.id === user.id) throw "You cannot ban yourself.";

        let mod = false;

        try {
            await assertMod(user, id);
            mod = true;
        } catch {}

        if (mod) throw "You cannot ban global mods or observers. If necessary, report their behavior to an observer.";

        const doc = await db.channels.findOneAndUpdate({ id }, { $addToSet: { bans: user.id } });
        if (doc!.bans.includes(user.id)) throw `${user} is already banned from ${channel!.name} everywhere.`;

        await log(channel!, `${cmd.user} banned ${user} from ${channel!.name}.`);
        return `${user} has been banned from ${channel!.name} everywhere.`;
    }
}
