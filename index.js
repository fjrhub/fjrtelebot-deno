import "jsr:@std/dotenv/load";
import { Bot } from "npm:grammy";

const TOKEN = Deno.env.get("TOKEN");
const bot = new Bot(TOKEN);

bot.command("ping", (ctx) => ctx.reply("🏓 Pong!"));
bot.start();

console.log("🤖 Bot is running on Deno...");
