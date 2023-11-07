import { embed } from "../../../lib/responses.js";

export default async function (_: unknown, isPublic: boolean | null) {
    return {
        ...embed({
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
        }),
        ephemeral: !isPublic,
    };
}
