import { ChannelType, Message } from "discord.js";
import { WithId } from "mongodb";
import bot from "./bot.js";
import db from "./db.js";
import logger from "./logger.js";
import Priority from "./priority.js";
import queue from "./queue.js";
import { GlobalChannel, GlobalMessage } from "./types.js";
import { addProfile, constructMessages, escapeRegExp, fetchName, log } from "./utils.js";

import { assertObserver } from "./permissions.js";
import scamlinks from "./scamlinks.js";

const scamfilter = scamlinks.map((link) => new RegExp(`\\b(https?://)?${escapeRegExp(link)}\\b`));

export async function maybeFilter(channel: GlobalChannel, message: Message, isNewMessage?: boolean) {
    if (channel.ignoreFilter || !message.content) return false;

    const filters = await db.filter.find().toArray();
    const regexes: Record<string, RegExp> = {};

    function getMatch(input: string): string | undefined {
        let match: string | undefined;

        for (const filter of [...scamfilter, ...filters]) {
            if (filter instanceof RegExp) match = input.match(filter)?.[0];
            else match = input.match((regexes[filter.match] ??= new RegExp(filter.match, "i")))?.[0];

            if (match) return match;
        }
    }

    let match = getMatch(message.content);
    let blockedObserverName = false;
    let accountTooYoung = false;

    if (!match && isNewMessage) {
        if (message.member?.joinedTimestamp && Date.now() - message.member.joinedTimestamp < 30 * 60 * 1000 && !channel.mods.includes(message.author.id)) {
            try {
                await assertObserver(message.author);
            } catch {
                match ||= "-";
                accountTooYoung = true;
            }
        }

        if (message.author.tag.match(/observer/i))
            try {
                await assertObserver(message.author);
            } catch {
                match = message.author.tag;
                blockedObserverName = true;
            }

        if (!match) match = getMatch(message.author.tag);

        if (!match) {
            const name = await fetchName(message.member, false);

            if (name.match(/observer/i))
                try {
                    await assertObserver(message.author);
                } catch {
                    match = name;
                    blockedObserverName = true;
                }

            if (!match) match = getMatch(name);
        }
    }

    if (!match) return false;

    await message.author
        .send({
            embeds: [
                {
                    title: "Blocked Message",
                    description: `${
                        accountTooYoung
                            ? "Your message was blocked because you joined the server too recently. Please wait until half an hour has passed since you joined the server to use global chat here."
                            : blockedObserverName
                            ? `Your message was blocked because your tag or display name (\`${match}\`) contains the word \`observer\` and you are not an observer.`
                            : `Your message was blocked due to the following term (either in your message or name): \`${match}\`.`
                    } If you believe this is a mistake, please contact an observer to review this filter rule.`,
                    color: 0x2b2d31,
                },
            ],
        })
        .catch(() => {});

    const [toLog] = await constructMessages(message, [{ replyStyle: "text", showServers: true, showTag: true, noReply: true }]);
    toLog.content = `**[blocked]** ${toLog.content ?? ""}`.slice(0, 2000);

    toLog.embeds = accountTooYoung
        ? [
              {
                  title: "Account Joined Too Recently",
                  description:
                      "This message was blocked because the user joined the originating server less than half an hour before attempting to send this message.",
                  color: 0x2b2d31,
              },
          ]
        : blockedObserverName
        ? [
              {
                  title: "Blocked Observer Name",
                  description: `This message was blocked because the user's tag or display name (\`${match}\`) contains the word \`observer\`, but they are not an observer.`,
                  color: 0x2b2d31,
              },
          ]
        : [
              {
                  title: "Blocked Term",
                  description: match,
                  color: 0x2b2d31,
              },
              ...(toLog.embeds ?? []),
          ].slice(0, 10);

    const logged = await log(channel, await addProfile(toLog, message.member ?? message.author, message.guild!, true, true));

    if (logged)
        await db.messages.insertOne({
            id: channel.id,
            author: message.author.id,
            guild: logged.guildId!,
            channel: logged.channelId,
            message: logged.id,
            instances: [],
        });

    await message.delete().catch(() => {});
    logger.info({ accountTooYoung, blockedObserverName, match }, "Filtered message");
    return true;
}

export async function relayDelete(doc: WithId<GlobalMessage>) {
    await queue(Priority.DELETE, async () => {
        await db.messages.updateOne({ _id: doc._id }, { $set: { deleted: true } });
        const connections = await db.connections.find({ id: doc.id }).toArray();

        await Promise.all(
            [...doc.instances, doc].map(async (instance) => {
                try {
                    const connection = connections.find((x) => x.channel === instance.channel);
                    if (!connection) return;

                    const channel = await bot.channels.fetch(instance.channel);
                    if (channel?.type !== ChannelType.GuildText) return;

                    let linked: Message | undefined | null | void;

                    try {
                        await channel.messages.delete(instance.message);
                        return;
                    } catch {}

                    linked = await channel.messages.fetch(instance.message).catch(() => {});
                    if (!linked) return;

                    try {
                        if (linked.webhookId) (await linked.fetchWebhook()).deleteMessage(linked);
                    } catch {}

                    await linked.delete();
                } catch (error) {
                    logger.error(error, "06d8e858-2469-49f8-bf84-818ada13bb81");
                }
            }),
        );
    });
}
