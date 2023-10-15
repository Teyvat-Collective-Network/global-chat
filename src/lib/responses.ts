import {
    APIEmbed,
    ActionRowData,
    ButtonStyle,
    Colors,
    ComponentType,
    InteractionEditReplyOptions,
    InteractionReplyOptions,
    MessageActionRowComponentData,
    MessageCreateOptions,
} from "discord.js";

export function greyButton(label: string): ActionRowData<MessageActionRowComponentData>[] {
    return [
        { type: ComponentType.ActionRow, components: [{ type: ComponentType.Button, style: ButtonStyle.Secondary, customId: "-", label, disabled: true }] },
    ];
}

export function confirm(key: string, body?: string): MessageCreateOptions & InteractionReplyOptions & InteractionEditReplyOptions {
    return {
        embeds: body ? [{ title: "Confirm", description: body, color: 0x2b2d31 }] : [],
        components: [
            {
                type: ComponentType.ActionRow,
                components: [
                    {
                        type: ComponentType.Button,
                        style: ButtonStyle.Success,
                        customId: key,
                        label: "Confirm",
                    },
                    {
                        type: ComponentType.Button,
                        style: ButtonStyle.Danger,
                        customId: "cancel",
                        label: "Cancel",
                    },
                ],
            },
        ],
        ephemeral: true,
    };
}

export function embed(data: APIEmbed) {
    data.color ??= 0x2b2d31;
    return { embeds: [data], files: [], components: [], ephemeral: true };
}

export function success(description: string) {
    return embed({ title: "OK", description });
}

export function failure(description: string) {
    return embed({ title: "Error", description, color: Colors.Red });
}
