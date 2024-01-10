import { ButtonInteraction } from "discord.js";
import api from "../api.js";
import { channels } from "../bot.js";
import broadcast, { formatUser } from "../broadcast.js";
import db from "../db.js";
import logger from "../logger.js";
import { assertLocalBan } from "../permissions.js";
import { getConnection } from "../utils.js";

export default async function (button: ButtonInteraction) {
    await button.deferUpdate();
    await assertLocalBan(button);

    const id = await getConnection(button.channelId);
    const doc = await db.channels.findOneAndUpdate({ id }, { $set: { panic: true } });

    if (doc!.panic) throw "This channel is already in lockdown.";

    const observers: { id: string }[] = await api(`/users?observers=true`);
    const ids = [...new Set([...observers.map(({ id }) => id), ...doc!.mods])];

    await channels.GLOBAL_MOD_CHAT.send({
        content: `${ids.map((id) => `<@${id}>`).join(" ")} ${doc!.name} was put into panic mode by ${
            button.user
        }. Please evaluate the situation and use \`/global unpanic\` when the incident is resolved.`,
        allowedMentions: { users: ids },
    });

    logger.info({ user: button.user.id, channel: id }, "a47e5d2e-b922-4514-9545-3c87b0f45cdf Panic confirmed");
    await broadcast("Panic Started", `${formatUser(button.user)} put ${doc!.name} into panic mode`);
    return `${doc!.name} has been put into panic mode / lockdown.`;
}
