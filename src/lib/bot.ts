import { Client, Events, IntentsBitField, Partials, TextChannel } from "discord.js";

const bot = new Client({
    allowedMentions: { parse: [] },
    intents: IntentsBitField.Flags.Guilds | IntentsBitField.Flags.GuildMembers | IntentsBitField.Flags.GuildMessages | IntentsBitField.Flags.MessageContent,
    partials: [Partials.Message],
    sweepers: { messages: { lifetime: 86400, interval: 600 } },
});

await bot.login(Bun.env.TOKEN);

await new Promise((r) => bot.on(Events.ClientReady, r));

export default bot;

export const channels = {
    GLOBAL_MOD_CHAT: (await bot.channels.fetch(Bun.env.GLOBAL_MOD_CHAT!)) as TextChannel,
};
