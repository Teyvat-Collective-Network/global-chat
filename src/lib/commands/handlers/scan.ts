import { ChannelType, ChatInputCommandInteraction } from "discord.js";
import bot from "../../bot.js";
import db from "../../db.js";
import { assertLogChannelPermissions, assertObserver, assertRelayChannelPermissions } from "../../permissions.js";
import { embed } from "../../responses.js";

export default async function (cmd: ChatInputCommandInteraction) {
    await cmd.deferReply({ ephemeral: true });
    await assertObserver(cmd.user);

    const fails: [string, string][] = [];

    for (const entry of await db.channels.find().toArray())
        try {
            const channel = await bot.channels.fetch(entry.logs);
            if (channel?.type !== ChannelType.GuildText) throw 0;

            try {
                await assertLogChannelPermissions(channel);
            } catch (e) {
                fails.push([entry.logs, e as string]);
            }
        } catch {
            fails.push([entry.logs, `could not fetch, or invalid channel type`]);
        }

    for (const entry of await db.connections.find().toArray())
        try {
            const channel = await bot.channels.fetch(entry.channel);
            if (channel?.type !== ChannelType.GuildText) throw 0;

            try {
                await assertRelayChannelPermissions(channel);
            } catch (e) {
                fails.push([entry.channel, e as string]);
            }
        } catch {
            fails.push([entry.channel, `could not fetch, or invalid channel type`]);
        }

    if (fails.length === 0) return "Every channel looks good.";

    let first = true;
    let block = (([x, y]) => `<#${x}>: ${y}`)(fails.shift()!);

    for (const [x, y] of fails)
        if (block.length + x.length + y.length + 7 <= 4096) block += `\n\n<#${x}>: ${y}`;
        else {
            if (first) await cmd.editReply(embed({ description: block, color: 0x2b2d31 }));
            else await cmd.followUp(embed({ description: block, color: 0x2b2d31 }));

            first = false;
            block = `<#${x}>: ${y}`;
        }

    if (first) await cmd.editReply(embed({ description: block, color: 0x2b2d31 }));
    else await cmd.followUp(embed({ description: block, color: 0x2b2d31 }));
}
