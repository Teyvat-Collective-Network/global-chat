import { ChatInputCommandInteraction, TextChannel } from "discord.js";
import broadcast, { formatUser } from "../../broadcast.js";
import db from "../../db.js";
import logger from "../../logger.js";
import { assertLogChannelPermissions, assertObserver } from "../../permissions.js";
import { log } from "../../utils.js";

export default async function (
    cmd: ChatInputCommandInteraction,
    id: number,
    name: string | null,
    logs: TextChannel | null,
    isPublic: boolean | null,
    ignoreFilter: boolean | null,
    plugins: string[] | null,
) {
    await cmd.deferReply({ ephemeral: true });
    await assertObserver(cmd.user);

    const doc = await db.channels.findOne({ id });
    if (!doc) throw "That global channel does not exist.";

    if (logs) {
        if ((await db.channels.countDocuments({ id: { $neq: id }, logs: logs.id })) >= 1)
            throw `${logs} is already being used as the logging channel for another global channel.`;

        await assertLogChannelPermissions(logs);
    }

    const $set: { name?: string; logs?: string; public?: boolean; ignoreFilter?: boolean; plugins?: string[] } = {};

    if (name) $set.name = name;
    if (logs) $set.logs = logs.id;
    if (isPublic !== null) $set.public = isPublic;
    if (ignoreFilter !== null) $set.ignoreFilter = ignoreFilter;
    if (plugins !== null) $set.plugins = plugins;

    await db.channels.updateOne({ id }, { $set });

    const text = `pdated global channel #${id}:\n${$set.name ? `- **Renamed:** ${doc.name} :arrow_right: ${$set.name}\n` : ""}${
        $set.logs ? `- **Log Channel:** <#${doc.logs}> :arrow_right: <#${$set.logs}>\n` : ""
    }${$set.public !== undefined ? `- **Public**: \`${doc.public}\` :arrow_right: \`${$set.public}\`\n` : ""}${
        $set.ignoreFilter !== undefined ? `- **Ignore Filter**: \`${doc.ignoreFilter}\` :arrow_right: \`${$set.ignoreFilter}\`\n` : ""
    }${
        $set.plugins !== undefined
            ? `- **Plugins**: \`${(doc?.plugins ?? []).join(", ") || "(none)"}\` :arrow_right: \`${$set.plugins.join(", ") || "(none)"}\`\n`
            : ""
    }`;

    await log(doc, `${cmd.user} u${text}`);
    if ($set.logs) await log($set.logs, `${cmd.user} u${text}`);

    const plaintext = text.replace("**", "").replace(":arrow_right:", "=>");

    logger.info(`${cmd.user.id} u${plaintext}`);
    await broadcast("Channel Edited", `Edited by ${formatUser(cmd.user)}`, `U${plaintext}`);

    return `U${text}`;
}
