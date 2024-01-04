import { ApplicationCommandType, Colors, Events, InteractionEditReplyOptions, InteractionReplyOptions, TextChannel } from "discord.js";
import bot from "./bot.js";
import channel from "./commands/autocomplete/channel.js";
import author from "./commands/handlers/author.js";
import ban from "./commands/handlers/ban.js";
import channelsCreate from "./commands/handlers/channels-create.js";
import channelsDelete from "./commands/handlers/channels-delete.js";
import channelsEdit from "./commands/handlers/channels-edit.js";
import connect from "./commands/handlers/connect.js";
import connectionEdit from "./commands/handlers/connection-edit.js";
import connectionMove from "./commands/handlers/connection-move.js";
import connectionSuspend from "./commands/handlers/connection-suspend.js";
import connectionUnsuspend from "./commands/handlers/connection-unsuspend.js";
import disconnect from "./commands/handlers/disconnect.js";
import help from "./commands/handlers/help.js";
import modsAdd from "./commands/handlers/mods-add.js";
import modsList from "./commands/handlers/mods-list.js";
import modsRemove from "./commands/handlers/mods-remove.js";
import nickname from "./commands/handlers/nickname.js";
import panic from "./commands/handlers/panic.js";
import purgeMessage from "./commands/handlers/purge-message.js";
import scan from "./commands/handlers/scan.js";
import unban from "./commands/handlers/unban.js";
import unpanic from "./commands/handlers/unpanic.js";
import cancel from "./components/cancel.js";
import confirmChannelsDelete from "./components/confirm-channels-delete.js";
import confirmDisconnect from "./components/confirm-disconnect.js";
import confirmPanic from "./components/confirm-panic.js";
import infoOnUserDeclareNone from "./components/info-on-user-declare-none.js";
import logger from "./logger.js";
import reply from "./reply.js";
import { failure, success } from "./responses.js";

bot.on(Events.InteractionCreate, async (interaction) => {
    try {
        let response: string | (InteractionReplyOptions & InteractionEditReplyOptions) | void = undefined;

        if (interaction.isCommand()) {
            if (interaction.commandType === ApplicationCommandType.ChatInput) {
                const opts = interaction.options;

                if (interaction.commandName === "global") {
                    const group = interaction.options.getSubcommandGroup(false);
                    const sub = interaction.options.getSubcommand();
                    const key = group ? `${group}/${sub}` : sub;

                    response =
                        key === "scan"
                            ? await scan(interaction)
                            : key === "channels/create"
                            ? await channelsCreate(
                                  interaction,
                                  opts.getString("name", true),
                                  opts.getChannel("logs", true) as TextChannel,
                                  opts.getBoolean("public") ?? true,
                                  opts.getBoolean("ignore-filter") ?? false,
                                  (opts.getString("plugins") ?? "").split(/\s+/).filter((x) => x && x !== "-"),
                              )
                            : key === "channels/edit"
                            ? await channelsEdit(
                                  interaction,
                                  opts.getInteger("channel", true),
                                  opts.getString("name"),
                                  opts.getChannel("logs") as TextChannel | null,
                                  opts.getBoolean("public"),
                                  opts.getBoolean("ignore-filter"),
                                  opts
                                      .getString("plugins")
                                      ?.split(/\s+/)
                                      ?.filter((x) => x && x !== "-") ?? null,
                              )
                            : key === "channels/delete"
                            ? await channelsDelete(interaction, opts.getInteger("channel", true))
                            : key === "mods/add"
                            ? await modsAdd(interaction, opts.getUser("user", true), opts.getInteger("channel"))
                            : key === "mods/remove"
                            ? await modsRemove(interaction, opts.getUser("user", true), opts.getInteger("channel"))
                            : key === "mods/list"
                            ? await modsList(interaction, opts.getInteger("channel"))
                            : key === "ban"
                            ? await ban(interaction, opts.getUser("user", true), opts.getInteger("channel"), opts.getBoolean("local"))
                            : key === "unban"
                            ? await unban(interaction, opts.getUser("user", true), opts.getInteger("channel"), opts.getBoolean("local"))
                            : key === "connect"
                            ? await connect(
                                  interaction,
                                  opts.getInteger("channel", true),
                                  opts.getString("reply-style"),
                                  opts.getBoolean("show-servers"),
                                  opts.getBoolean("show-tag"),
                              )
                            : key === "disconnect"
                            ? await disconnect(interaction)
                            : key === "connection/move"
                            ? await connectionMove(interaction, opts.getChannel("channel", true) as TextChannel)
                            : key === "connection/suspend"
                            ? await connectionSuspend(interaction)
                            : key === "connection/unsuspend"
                            ? await connectionUnsuspend(interaction)
                            : key === "connection/edit"
                            ? await connectionEdit(interaction, opts.getString("reply-style"), opts.getBoolean("show-servers"), opts.getBoolean("show-tag"))
                            : key === "help"
                            ? await help(interaction, opts.getBoolean("public"))
                            : key === "nickname"
                            ? await nickname(interaction, opts.getString("nickname"))
                            : key === "panic"
                            ? await panic(interaction)
                            : key === "unpanic"
                            ? await unpanic(interaction)
                            : key === "purge/message"
                            ? await purgeMessage(interaction, opts.getString("message", true))
                            : key === "author"
                            ? await author(interaction, opts.getString("message", true))
                            : undefined;
                }
            } else if (interaction.commandType === ApplicationCommandType.Message) {
                const key = interaction.commandName;

                response =
                    key === "Purge"
                        ? await purgeMessage(interaction, interaction.targetId)
                        : key === "Get Author"
                        ? await author(interaction, interaction.targetId)
                        : undefined;
            }
        } else if (interaction.isAutocomplete()) {
            const opt = interaction.options.getFocused(true);
            const values: (string | [string, string | number])[] = opt.name === "channel" ? await channel(opt, interaction) : [];

            await interaction.respond(values.map((value) => (typeof value === "string" ? { name: value, value } : { name: value[0], value: value[1] })));
        } else if (interaction.isButton()) {
            const [id, ...args] = interaction.customId.split(":");

            response =
                id === "delete"
                    ? void (await interaction.message.delete().catch(() => {}))
                    : id === "cancel"
                    ? await cancel(interaction)
                    : id === "channels/delete"
                    ? await confirmChannelsDelete(interaction, +args[0])
                    : id === "disconnect"
                    ? await confirmDisconnect(interaction)
                    : id === "panic"
                    ? await confirmPanic(interaction)
                    : id === "info-on-user-declare-none"
                    ? await infoOnUserDeclareNone(interaction)
                    : undefined;
        }

        if (response) await reply(interaction, typeof response === "string" ? success(response) : response);
    } catch (error) {
        if (error instanceof Error) {
            let key = "{unidentified}";

            if (interaction.isCommand()) {
                if (interaction.commandType === ApplicationCommandType.ChatInput) {
                    key = `/${interaction.commandName}`;
                }
            }

            logger.error(error, `f89cfee0-9df4-4a55-9fab-f873b651da36 Error handling interaction ${key}`);
            await reply(interaction, failure("An unexpected error occurred. If this issue persists, please contact a developer."));
        } else if (typeof error === "string") await reply(interaction, failure(error));
        else if (typeof error === "object") await reply(interaction, { embeds: [{ title: "Error", color: Colors.Red, ...error }], ephemeral: true });
    }
});
