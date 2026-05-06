import "jsr:@std/dotenv/load";
import { webhookCallback } from "npm:grammy";
import { bot } from "./bot.js";
import { registerHandlers } from "./handler.js";
import { registerCrons } from "./cron/index.js";

registerHandlers(bot);
registerCrons(bot);

const handleUpdate = webhookCallback(bot, "std/http");

Deno.serve(handleUpdate);