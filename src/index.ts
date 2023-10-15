import bot from "./lib/bot.js";
import commands from "./lib/commands/index.js";
import { connect } from "./lib/db.js";
import "./lib/events/index.js";
import "./lib/interactions.js";
import logger from "./lib/logger.js";

await connect();
logger.info({ location: "f7796042-d61b-4e0a-b8a4-c32b9e40a4d6" }, `TCN Global Chat Bot is running.`);

bot.application!.commands.set(commands);
