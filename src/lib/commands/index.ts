import { ApplicationCommandData, ApplicationCommandOptionType, ApplicationCommandType, ChannelType } from "discord.js";
import "../interactions.js";

export default [
    {
        type: ApplicationCommandType.ChatInput,
        name: "global",
        description: "global chat text commands",
        dmPermission: false,
        options: [
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "scan",
                description: "scan for channels with improper permissions",
            },
            {
                type: ApplicationCommandOptionType.SubcommandGroup,
                name: "channels",
                description: "global chat channel commands",
                options: [
                    {
                        type: ApplicationCommandOptionType.Subcommand,
                        name: "create",
                        description: "create a new global channel",
                        options: [
                            {
                                type: ApplicationCommandOptionType.String,
                                name: "name",
                                description: "the name of the global channel",
                                required: true,
                                minLength: 1,
                                maxLength: 32,
                            },
                            {
                                type: ApplicationCommandOptionType.Channel,
                                channelTypes: [ChannelType.GuildText],
                                name: "logs",
                                description: "the channel to which to output logs for this global channel",
                                required: true,
                            },
                            {
                                type: ApplicationCommandOptionType.Boolean,
                                name: "public",
                                description: "if false, only observers can connect to this channel (default: true)",
                            },
                            {
                                type: ApplicationCommandOptionType.Boolean,
                                name: "ignore-filter",
                                description: "if true, the global chat automod filter will not be applied (default: false)",
                            },
                            {
                                type: ApplicationCommandOptionType.String,
                                name: "plugins",
                                description: "a space-separated list of plugins (default: none, - to remove all)",
                            },
                        ],
                    },
                    {
                        type: ApplicationCommandOptionType.Subcommand,
                        name: "edit",
                        description: "edit a global channel",
                        options: [
                            {
                                type: ApplicationCommandOptionType.Integer,
                                name: "channel",
                                description: "the global channel to edit",
                                required: true,
                                autocomplete: true,
                            },
                            {
                                type: ApplicationCommandOptionType.String,
                                name: "name",
                                description: "the name of the global channel",
                                minLength: 1,
                                maxLength: 32,
                            },
                            {
                                type: ApplicationCommandOptionType.Channel,
                                channelTypes: [ChannelType.GuildText],
                                name: "logs",
                                description: "the channel to which to output logs for this global channel",
                            },
                            {
                                type: ApplicationCommandOptionType.Boolean,
                                name: "public",
                                description: "if false, only observers can connect to this channel",
                            },
                            {
                                type: ApplicationCommandOptionType.Boolean,
                                name: "ignore-filter",
                                description: "if true, the global chat automod filter will not be applied",
                            },
                            {
                                type: ApplicationCommandOptionType.String,
                                name: "plugins",
                                description: "a space-separated list of plugins (- to remove all)",
                            },
                        ],
                    },
                    {
                        type: ApplicationCommandOptionType.Subcommand,
                        name: "delete",
                        description: "delete a global channel",
                        options: [
                            {
                                type: ApplicationCommandOptionType.Integer,
                                name: "channel",
                                description: "the global channel to delete",
                                required: true,
                                autocomplete: true,
                            },
                        ],
                    },
                ],
            },
            {
                type: ApplicationCommandOptionType.SubcommandGroup,
                name: "mods",
                description: "manage moderators",
                options: [
                    {
                        type: ApplicationCommandOptionType.Subcommand,
                        name: "add",
                        description: "promote a user to moderator",
                        options: [
                            {
                                type: ApplicationCommandOptionType.User,
                                name: "user",
                                description: "the user to promote",
                                required: true,
                            },
                            {
                                type: ApplicationCommandOptionType.Integer,
                                name: "channel",
                                description: "the channel in which to promote the user (default: current)",
                                autocomplete: true,
                            },
                        ],
                    },
                    {
                        type: ApplicationCommandOptionType.Subcommand,
                        name: "remove",
                        description: "demote a user from moderator",
                        options: [
                            {
                                type: ApplicationCommandOptionType.User,
                                name: "user",
                                description: "the user to demote",
                                required: true,
                            },
                            {
                                type: ApplicationCommandOptionType.Integer,
                                name: "channel",
                                description: "the channel in which to demote the user (default: current)",
                                autocomplete: true,
                            },
                        ],
                    },
                    {
                        type: ApplicationCommandOptionType.Subcommand,
                        name: "list",
                        description: "list all global chat moderators",
                        options: [
                            {
                                type: ApplicationCommandOptionType.Integer,
                                name: "channel",
                                description: "the channel whose moderators to list (default: all)",
                                autocomplete: true,
                            },
                        ],
                    },
                ],
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "ban",
                description: "ban a user from global chat",
                options: [
                    {
                        type: ApplicationCommandOptionType.User,
                        name: "user",
                        description: "the user to ban",
                        required: true,
                    },
                    {
                        type: ApplicationCommandOptionType.Integer,
                        name: "channel",
                        description: "the channel from which to ban the user (default: current)",
                        autocomplete: true,
                    },
                    {
                        type: ApplicationCommandOptionType.Boolean,
                        name: "local",
                        description: "if true, only ban the user from this server's connection (default: false)",
                    },
                ],
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "unban",
                description: "unban a user from global chat",
                options: [
                    {
                        type: ApplicationCommandOptionType.User,
                        name: "user",
                        description: "the user to unban",
                        required: true,
                    },
                    {
                        type: ApplicationCommandOptionType.Integer,
                        name: "channel",
                        description: "the channel from which to unban the user (default: current)",
                        autocomplete: true,
                    },
                    {
                        type: ApplicationCommandOptionType.Boolean,
                        name: "local",
                        description: "if true, remove the user from this server's connection's ban list (default: false)",
                    },
                ],
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "connect",
                description: "connect (the current channel) to a global channel",
                options: [
                    {
                        type: ApplicationCommandOptionType.Integer,
                        name: "channel",
                        description: "the channel to which to connect",
                        required: true,
                        autocomplete: true,
                    },
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "reply-style",
                        description: "the style in which to display reply messages (default: text-based)",
                        choices: [
                            { name: "text-based (traditional)", value: "text" },
                            { name: "embed-based", value: "embed" },
                        ],
                    },
                    {
                        type: ApplicationCommandOptionType.Boolean,
                        name: "show-servers",
                        description: "if false, hide the origin server for incoming messages (default: true)",
                    },
                    {
                        type: ApplicationCommandOptionType.Boolean,
                        name: "show-tag",
                        description: "if true, show the user's tag instead of their username (default: false)",
                    },
                ],
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "disconnect",
                description: "disconnect the current channel, also destroying this guild's data",
            },
            {
                type: ApplicationCommandOptionType.SubcommandGroup,
                name: "connection",
                description: "manage the current connection",
                options: [
                    {
                        type: ApplicationCommandOptionType.Subcommand,
                        name: "move",
                        description: "move the connection to a different channel",
                        options: [
                            {
                                type: ApplicationCommandOptionType.Channel,
                                channelTypes: [ChannelType.GuildText],
                                name: "channel",
                                description: "the channel to which to move the connection",
                                required: true,
                            },
                        ],
                    },
                    {
                        type: ApplicationCommandOptionType.Subcommand,
                        name: "suspend",
                        description: "temporarily suspend the connection, disabling relay in both directions",
                    },
                    {
                        type: ApplicationCommandOptionType.Subcommand,
                        name: "unsuspend",
                        description: "unsuspend the connection, restoring relay in both directions",
                    },
                    {
                        type: ApplicationCommandOptionType.Subcommand,
                        name: "edit",
                        description: "edit the connection",
                        options: [
                            {
                                type: ApplicationCommandOptionType.String,
                                name: "reply-style",
                                description: "the style in which to display reply messages",
                                choices: [
                                    { name: "text-based (traditional)", value: "text" },
                                    { name: "embed-based", value: "embed" },
                                ],
                            },
                            {
                                type: ApplicationCommandOptionType.Boolean,
                                name: "show-servers",
                                description: "if false, hide the origin server for incoming messages",
                            },
                            {
                                type: ApplicationCommandOptionType.Boolean,
                                name: "show-tag",
                                description: "if true, show the user's tag instead of their username",
                            },
                        ],
                    },
                ],
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "help",
                description: "show info about global chat",
                options: [
                    {
                        type: ApplicationCommandOptionType.Boolean,
                        name: "public",
                        description: "if true, make the reply visible to other users",
                    },
                ],
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "nickname",
                description: "set your global chat nickname",
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "nickname",
                        description: "the nickname to use (or blank to remove)",
                        minLength: 1,
                        maxLength: 32,
                    },
                ],
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "panic",
                description: "shut down the current global channel entirely, halting message relaying",
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "unpanic",
                description: "restore the current global channel (revert /global panic)",
            },
            {
                type: ApplicationCommandOptionType.SubcommandGroup,
                name: "purge",
                description: "purge commands",
                options: [
                    {
                        type: ApplicationCommandOptionType.Subcommand,
                        name: "message",
                        description: "force-purge a global chat message again",
                        options: [
                            {
                                type: ApplicationCommandOptionType.String,
                                name: "message",
                                description: "the ID of the message to purge in your channel",
                                required: true,
                            },
                        ],
                    },
                ],
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "author",
                description: "fetch the author of a message",
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "message",
                        description: "the ID of any instance of the message",
                        required: true,
                    },
                ],
            },
        ],
    },
    {
        type: ApplicationCommandType.Message,
        name: "Purge",
        dmPermission: false,
    },
    {
        type: ApplicationCommandType.Message,
        name: "Get Author",
        dmPermission: false,
    },
] satisfies ApplicationCommandData[];
