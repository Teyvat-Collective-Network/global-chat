import { ChatInputCommandInteraction } from "discord.js";
import db from "../../db.js";
import logger from "../../logger.js";
import { assertObserver } from "../../permissions.js";
import { confirm } from "../../responses.js";

export default async function (cmd: ChatInputCommandInteraction, id: number) {
    await cmd.deferReply({ ephemeral: true });
    await assertObserver(cmd.user);

    const channel = await db.channels.findOne({ id });
    if (!channel) throw "That global channel does not exist.";

    logger.info({ user: cmd.user.id, channel: id }, "b329f69a-8173-43c2-b749-085c68fcef29 Channel delete initiated (not confirmed)");

    return confirm(
        `channels/delete:${id}`,
        `Are you sure you want to delete ${channel.name}? This will irreversibly erase all data, including mods, bans, all servers' connections and their connection settings, and channel stats. All messages will also be unlinked, preventing edit or deletion relaying.`,
    );
}
