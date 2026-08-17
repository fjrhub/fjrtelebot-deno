import "jsr:@std/dotenv/load";
import { webhookCallback } from "npm:grammy";
import { bot } from "./bot.js";
import { registerHandlers } from "./handler.js";

registerHandlers(bot);

const handleUpdate = webhookCallback(bot, "std/http");

Deno.serve(handleUpdate);