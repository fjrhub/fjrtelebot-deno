import "jsr:@std/dotenv/load";
import { bot } from "./bot.js";
import { registerHandlers } from "./handler.js";

registerHandlers(bot);

console.log("Bot jalan di mode polling (dev)...");
await bot.start();