import { ButtonComponent, ButtonInteraction, ChannelType, ComponentType, InteractionUpdateOptions, MessageEditOptions } from "discord.js";
import api from "../api.js";
import bot from "../bot.js";
import db from "../db.js";
import logger from "../logger.js";
import { fetchGuildName } from "../utils.js";

export default async function (button: ButtonInteraction) {
    await button.deferUpdate();

    const doc = await db.info_on_user_requests.findOneAndUpdate(
        { instances: { channel: button.message.channelId, message: button.message.id } },
        { $addToSet: { guilds: button.guildId! } },
    );

    if (!doc || doc.guilds.includes(button.guildId!)) return;

    const guilds: Record<string, string> = Object.fromEntries(
        (((await api(`/guilds`).catch(() => {})) as { id: string; name: string }[] | undefined) ?? []).map((x) => [x.id, x.name]),
    );

    guilds[Bun.env.HQ!] = "TCN HQ";
    guilds[Bun.env.HUB!] = "TCN Hub";

    const data: MessageEditOptions & InteractionUpdateOptions = {
        embeds: [
            {
                ...button.message.embeds[0].toJSON(),
                description: `${button.message.embeds[0].description}, ${await fetchGuildName(button.guild!)}`,
            },
        ],
        components: [
            {
                type: ComponentType.ActionRow,
                components: [{ ...(button.message.components[0].components[0] as ButtonComponent).toJSON(), label: `No Info Here (${doc.guilds.length + 1})` }],
            },
        ],
    };

    await Promise.all(
        doc.instances.map(async (x) => {
            try {
                if (x.message === button.message.id) return;

                const channel = await bot.channels.fetch(x.channel);
                if (channel?.type !== ChannelType.GuildText) return;

                const message = await channel.messages.fetch(x.message);
                await message.edit(data);
            } catch (error) {
                logger.error(error, "c147446d-dec5-400d-a9c3-253a74183ed2");
            }
        }),
    );

    await button.editReply(data);
}
