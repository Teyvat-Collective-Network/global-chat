import { embed } from "../../../lib/responses.js";

export default async function (_: unknown, page: string | null, isPublic: boolean | null) {
    return {
        ...embed(
            {
                faq: {
                    title: "Global Chat FAQ",
                    fields: [
                        {
                            name: "What is global chat?",
                            value: "Global chat is a system that allows users in different servers to talk to each other. Messages sent to connected channels will be copied to other connected channels using webhooks.",
                        },
                        {
                            name: "Why is everyone a bot?",
                            value: "Messages are relayed using webhooks to display the other user's username and avatar, simulating them sending the message themselves as closely as possible. The BOT tag behind their name is to show that it's not an actual user, but an automated system.",
                        },
                    ],
                },
                rules: {
                    title: "Global Chat Rules",
                    description:
                        "To contact an observer, join the [TCN Hub](https://discord.gg/FG2wpbywSx) and contact modmail by DMing the bot named `Teyvat Collective#1616`.",
                    fields: [
                        {
                            name: "Be Nice",
                            value: "If other users are being disrespectful, disengage and reach out to a mod if needed. Being nice extends to all parties, including other members, moderators, users not in global chat, and non-TCN servers.",
                        },
                        {
                            name: "No NSFW/NSFL",
                            value: "Most connected servers are strict on NSFW. Even if your server is more lenient, most aren't, and the rules will be enforced following strict standards. This applies to media, text, usernames, avatars, etc.",
                        },
                        {
                            name: "No Leaks / Unmarked Spoilers",
                            value: "Leaks are not allowed in global channels. This rule applies to both Genshin Impact and other games / media. Mark spoilers (within reason).",
                        },
                        {
                            name: "No Drama",
                            value: "Do not complain about your ban / mute in another server. If you have an issue with a TCN server or a moderator's actions, you can contact the TCN via modmail. Personal and server drama is not to be discussed. Polticial, religious, and other controversial topics are strongly discouraged as they may quickly get out of your control.",
                        },
                        {
                            name: "No Spam",
                            value: "Do not flood chat. Be considerate of others' use of the channel. Do not jump from server to server sending messages just for the sake of it as it is disruptive.",
                        },
                        {
                            name: "No Advertisement",
                            value: "Do not advertise. This includes self-promotion, server advertisement, etc.",
                        },
                        {
                            name: "Language (English)",
                            value: "For moderation purposes, please use English.",
                        },
                        {
                            name: "Listen to Staff",
                            value: "These rules are guidelines are are not intended to be exhaustive. Moderators are entrusted to make the final call on situations. If you believe a moderator's actions were not in good faith, counterproductive, or otherwise a mistake, please contact the TCN through modmail.",
                        },
                    ],
                },
            }[page ?? "faq"] ?? {},
        ),
        ephemeral: !isPublic,
    };
}
