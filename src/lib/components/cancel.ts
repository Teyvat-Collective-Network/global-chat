import { ButtonInteraction } from "discord.js";
import { greyButton } from "../responses.js";

export default async function (button: ButtonInteraction) {
    await button.update({ components: greyButton("Canceled"), embeds: [], files: [] });
}
