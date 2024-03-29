import { ButtonStyle, ChannelType, ComponentType, Events, Message, MessageFlags, MessageReplyOptions, MessageType } from "discord.js";
import { maybeFilter } from "../../actions.js";
import bot from "../../bot.js";
import db from "../../db.js";
import logger from "../../logger.js";
import { RELAY_CHANNEL_PERMISSIONS_ESSENTIAL, assertMod } from "../../permissions.js";
import Priority from "../../priority.js";
import queue from "../../queue.js";
import { constructMessages, fetchGuildName, fetchName, getConnection, getWebhook, isUsedWebhook } from "../../utils.js";

bot.on(Events.MessageCreate, async (message) => {
    if (message.channel.type !== ChannelType.GuildText) return;
    if (message.webhookId && (await isUsedWebhook(message.webhookId))) return;

    const id = await getConnection(message.channelId).catch(() => {});
    if (!id) return;

    const doc = await db.connections.findOne({ id, guild: message.guildId! });
    if (!doc) return;
    if (doc.suspended) return;

    logger.info({ url: message.url }, "7aae991e-79e3-46b5-84c7-0b3ac7c44e96 Queue Relay");

    await queue(Priority.RELAY, async () => {
        const channel = await db.channels.findOne({ id });
        if (!channel) return;

        if (channel.bans.includes(message.author.id)) return await message.delete().catch(() => {});

        const source = await db.connections.findOne({ id, guild: message.guild!.id });
        if (!source) return;
        if (source.bans.includes(message.author.id)) return await message.delete().catch(() => {});

        if (await maybeFilter(channel, message, true)) return;

        if (channel.panic)
            try {
                await assertMod(message.author, id);
            } catch {
                return;
            }

        if (message.flags.has(MessageFlags.SuppressNotifications)) return;
        if (![MessageType.ChatInputCommand, MessageType.ContextMenuCommand, MessageType.Default, MessageType.Reply].includes(message.type)) return;

        const connections = await db.connections.find({ id, guild: { $ne: message.guildId! }, suspended: false, bans: { $ne: message.author.id } }).toArray();

        const tracker = { failedStickers: false };
        const copies = Object.fromEntries((await constructMessages(message, connections, tracker)).map((x, i) => [connections[i].channel, x]));

        if (tracker.failedStickers)
            message.reply({
                content:
                    "Hey! Your sticker could not be converted into an image to send to other servers. They will receive a notice that your sticker did not work, and the rest of your message was still relayed.",
                flags: [MessageFlags.SuppressNotifications],
            });

        const avatarURL = (message.member ?? message.author).displayAvatarURL();
        const usernameWithTag = await fetchName(message.member ?? message.author, true);
        const usernameWithoutTag = await fetchName(message.member ?? message.author, false);
        const guildname = await fetchGuildName(message.guild!);

        const messages = await Promise.all(
            connections.map(async (connection) => {
                try {
                    const { channel: id, showServers, showTag } = connection;

                    const output = await bot.channels.fetch(id);
                    if (output?.type !== ChannelType.GuildText) return;

                    if (!output.permissionsFor(output.client.user)?.has(RELAY_CHANNEL_PERMISSIONS_ESSENTIAL)) {
                        logger.error(`Deliberately skipped replicating message to ${output.id} because of improper permission configuration.`);
                        return;
                    }

                    const webhook = await getWebhook(output);
                    if (!webhook || channel.panic) return;

                    return await webhook.send({
                        ...copies[connection.channel],
                        avatarURL,
                        username: `${showTag ? usernameWithTag : usernameWithoutTag} ${showServers ? `from ${guildname}` : ""}`,
                    });
                } catch (error) {
                    logger.error(error, "eb4afe59-fbc5-48b4-bc2d-af991ef04679");
                    logger.error(`Origin: ${message.url}`);
                }
            }),
        );

        await db.messages.insertOne({
            id,
            author: message.author.id,
            guild: message.guildId!,
            channel: message.channelId,
            message: message.id,
            instances: messages.filter((x) => x).map((x) => ({ channel: x!.channelId, message: x!.id })),
        });

        (async () => {
            if (!channel.plugins?.includes("info-on-user-prompts")) return;
            if (!message.content.match(/info.*on.*[1-9][0-9]{16,19}/im)) return;

            const reply = await message.reply({
                components: [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            {
                                type: ComponentType.Button,
                                style: ButtonStyle.Success,
                                customId: "create-info-on-user",
                                label: "Set up info-on-user request utility",
                            },
                            {
                                type: ComponentType.Button,
                                style: ButtonStyle.Danger,
                                customId: "delete",
                                label: "No thanks (5m)",
                            },
                        ],
                    },
                ],
                flags: [MessageFlags.SuppressNotifications],
            });

            const response = await reply
                .awaitMessageComponent({
                    time: 5 * 60 * 1000,
                    filter: (x) => x.user.id === message.author.id,
                    componentType: ComponentType.Button,
                })
                .catch(() => void reply.delete());

            if (response?.customId !== "create-info-on-user") return;
            await response.message.delete().catch(() => {});

            const doc = await db.messages.findOne({ message: response.message.reference!.messageId });
            if (!doc) return;

            const data: MessageReplyOptions = {
                embeds: [
                    {
                        title: "Info-on-User Request",
                        description: `Reported no info: ${await fetchGuildName(message.guild!)}`,
                        footer: { text: "Click below to report no info from your server." },
                    },
                ],
                components: [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            { type: ComponentType.Button, style: ButtonStyle.Secondary, customId: "info-on-user-declare-none", label: "No Info Here (1)" },
                        ],
                    },
                ],
                flags: [MessageFlags.SuppressNotifications],
            };

            const prompts: (Message | undefined | void)[] = await Promise.all(
                doc.instances.map(async (instance) => {
                    try {
                        const connection = connections.find((x) => x.channel === instance.channel);
                        if (!connection) return;

                        const channel = await bot.channels.fetch(instance.channel);
                        if (channel?.type !== ChannelType.GuildText) return;

                        const linked = await channel.messages.fetch(instance.message).catch(() => {});
                        if (!linked) return;

                        return await linked.reply(data);
                    } catch (error) {
                        logger.error(error, "bd157def-80a6-4fef-adbe-9ecf5006357d");
                    }
                }),
            );

            prompts.push(await message.reply(data).catch(() => {}));

            await db.info_on_user_requests.insertOne({
                instances: prompts.filter((x) => x).map((x) => ({ channel: x!.channelId, message: x!.id })),
                guilds: [message.guildId!],
            });
        })();
    });
});
