import { ButtonInteraction, Channel, ChatInputCommandInteraction, GuildMember, PermissionsBitField, TextChannel, User } from "discord.js";
import api from "./api.js";
import db from "./db.js";

const LOG_CHANNEL_PERMISSIONS_MAP = {
    [`${PermissionsBitField.Flags.ViewChannel}`]: "View Channel",
    [`${PermissionsBitField.Flags.SendMessages}`]: "Send Messages",
    [`${PermissionsBitField.Flags.EmbedLinks}`]: "Embed Links",
    [`${PermissionsBitField.Flags.AttachFiles}`]: "Attach Files",
    [`${PermissionsBitField.Flags.ManageWebhooks}`]: "Manage Webhooks",
    [`${PermissionsBitField.Flags.UseExternalEmojis}`]: "Use External Emoji",
};

const RELAY_CHANNEL_PERMISSIONS_MAP = {
    [`${PermissionsBitField.Flags.ViewChannel}`]: "View Channel",
    [`${PermissionsBitField.Flags.ReadMessageHistory}`]: "Read Message History",
    [`${PermissionsBitField.Flags.EmbedLinks}`]: "Embed Links",
    [`${PermissionsBitField.Flags.AttachFiles}`]: "Attach Files",
    [`${PermissionsBitField.Flags.ManageWebhooks}`]: "Manage Webhooks",
    [`${PermissionsBitField.Flags.ManageMessages}`]: "Manage Messages",
};

export const LOG_CHANNEL_PERMISSIONS = Object.keys(LOG_CHANNEL_PERMISSIONS_MAP)
    .map(BigInt)
    .reduce((x, y) => x | y);

export const RELAY_CHANNEL_PERMISSIONS = Object.keys(RELAY_CHANNEL_PERMISSIONS_MAP)
    .map(BigInt)
    .reduce((x, y) => x | y);

export const RELAY_CHANNEL_PERMISSIONS_ESSENTIAL =
    PermissionsBitField.Flags.ViewChannel |
    PermissionsBitField.Flags.ReadMessageHistory |
    PermissionsBitField.Flags.ManageWebhooks |
    PermissionsBitField.Flags.ManageMessages;

export async function assertTCN(interaction: ChatInputCommandInteraction | ButtonInteraction, allowObserverOverride: boolean = false) {
    const req = await api(`!/guilds/${interaction.guildId}`);
    if (req.ok) return;

    if (!allowObserverOverride) throw "This is not a TCN server.";
    await assertObserver(interaction.user, "You must be a TCN observer to do this in a non-TCN server.");
}

export async function assertObserver(user: User | GuildMember, error: string = "You are not an observer.") {
    const apiUser: { observer: boolean } = await api(`/users/${user.id}`);
    if (!apiUser.observer) throw error;
}

export async function assertAdmin(interaction: ChatInputCommandInteraction | ButtonInteraction) {
    if (interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) return;
    await assertObserver(interaction.user, `You are not an administrator of this server.`);
}

export async function assertMod(user: User | GuildMember, channel: number) {
    const doc = await db.channels.findOne({ id: channel });
    if (!doc) throw "That is not a global channel.";

    if (doc.mods.includes(user.id)) return;

    await assertObserver(user, `You are not a moderator of "${doc.name}".`);
}

export async function assertLocalBan(interaction: ChatInputCommandInteraction | ButtonInteraction) {
    if (interaction.memberPermissions?.has(PermissionsBitField.Flags.BanMembers)) return;
    await assertObserver(interaction.user, "You must have the Ban Members permission.");
}

async function assertChannelPermissions(channel: TextChannel, required: bigint, map: Record<string, string>) {
    const missing = PermissionsBitField.resolve(channel.permissionsFor(channel.client.user)?.missing(required) ?? required);

    if (missing)
        throw `Please grant me the following permissions in ${channel} to use it as a logging channel:\n${Object.entries(map)
            .filter(([x]) => BigInt(x) & missing)
            .map(([, y]) => `- ${y}`)
            .join("\n")}`;
}

export async function assertLogChannelPermissions(logs: TextChannel) {
    await assertChannelPermissions(logs, LOG_CHANNEL_PERMISSIONS, LOG_CHANNEL_PERMISSIONS_MAP);
}

export async function assertRelayChannelPermissions(relay: TextChannel) {
    await assertChannelPermissions(relay, RELAY_CHANNEL_PERMISSIONS, RELAY_CHANNEL_PERMISSIONS_MAP);
}

export async function assertUnused(channel: Channel) {
    {
        const doc = await db.channels.findOne({ logs: channel.id });
        if (doc) throw `${channel} is already in use as the logging channel for ${doc.name}.`;
    }

    {
        const doc = await db.connections.findOne({ channel: channel.id });

        if (doc) {
            const ch = await db.channels.findOne({ id: doc.id });
            throw `${channel} is already connected to ${ch!.name}.`;
        }
    }
}
