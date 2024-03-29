import { escapeHTML } from "bun";
import { ChatInputCommandInteraction, TextChannel } from "discord.js";
import broadcast, { formatUser } from "../../broadcast.js";
import db, { autoinc } from "../../db.js";
import logger from "../../logger.js";
import { assertLogChannelPermissions, assertObserver } from "../../permissions.js";

export default async function (cmd: ChatInputCommandInteraction, name: string, logs: TextChannel, isPublic: boolean, ignoreFilter: boolean, plugins: string[]) {
    await cmd.deferReply({ ephemeral: true });
    await assertObserver(cmd.user);

    if ((await db.channels.countDocuments({ name })) >= 1) throw "A global channel already exists with that name.";
    if ((await db.channels.countDocuments({ logs: logs.id })) >= 1) throw `${logs} is already being used as the logging channel for another global channel.`;

    await assertLogChannelPermissions(logs);

    await db.channels.insertOne({
        id: await autoinc("global-channels"),
        name,
        public: isPublic,
        logs: logs.id,
        mods: [],
        bans: [],
        panic: false,
        ignoreFilter,
        plugins,
    });

    await logs.send(`${cmd.user} created ${isPublic ? "public" : "private"} global channel ${name}. Logs will be posted here.`).catch(() => {});
    logger.info({ user: cmd.user.id, public: isPublic, name, logs: logs.id }, "c125642c-ca23-4cad-99f7-429e35da4516 Channel created");

    await broadcast(
        "Channel Created",
        `${formatUser(cmd.user)} created a ${isPublic ? "public" : "private"} channel named <code>${escapeHTML(name)}</code> with logs in <code>${
            logs.id
        }</code>`,
    );

    return `Created ${isPublic ? "public" : "private"} global channel ${name} with logging channel ${logs}.`;
}
