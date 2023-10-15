import { AutocompleteFocusedOption, AutocompleteInteraction } from "discord.js";
import api from "../../api.js";
import db from "../../db.js";
import { escapeRegExp } from "../../utils.js";

export default async function (opt: AutocompleteFocusedOption, cmd: AutocompleteInteraction): Promise<[string, number][]> {
    const user: { observer: boolean } = await api(`/users/${cmd.user.id}`);

    const channels = await db.channels
        .find({ name: RegExp(escapeRegExp(opt.value)), ...(user.observer ? {} : { public: true }) })
        .limit(25)
        .toArray();

    return channels.map((channel) => [channel.name, channel.id]);
}
