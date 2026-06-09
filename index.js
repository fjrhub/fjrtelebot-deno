import "jsr:@std/dotenv/load";
import { webhookCallback, Bot } from "npm:grammy";

const bot = new Bot(Deno.env.get("BOT_TOKEN"));

bot.command("ping", (ctx) => ctx.reply("🏓 Pong!"));
bot.command("start", (ctx) => ctx.reply("✅ Bot is working!"));

const handleUpdate = webhookCallback(bot, "std/http", {
  onTimeout: "return",
  timeoutMilliseconds: 10000,
});

Deno.serve(handleUpdate);