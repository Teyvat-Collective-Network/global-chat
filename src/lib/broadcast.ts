import { escapeHTML } from "bun";
import { Guild, GuildMember, User } from "discord.js";

export default async function (action: string, summary: string, details: string = "") {
    await fetch(`${Bun.env.INTERNAL_API}/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: "global", messages: [["global", action, summary, details]] }),
    }).catch(() => {});
}

export function formatUser(user: User | GuildMember | null | undefined | void, id?: string) {
    return `${escapeHTML(user ? ("user" in user ? user.user.displayName : user.displayName) : "Unknown User")} (<code>${id ?? user?.id}</code>)`;
}

export function formatObject(object: { name: string; id: string }) {
    return `${escapeHTML(object.name)} (<code>${object.id}</code>)`;
}
