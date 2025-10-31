import "jsr:@std/dotenv/load";
import { Bot, webhookCallback } from "npm:grammy";

const TOKEN = Deno.env.get("TOKEN");
const URL = Deno.env.get("URL"); // tambahkan ini di environment kamu (URL publik)

const bot = new Bot(TOKEN);

bot.command("ping", (ctx) => ctx.reply("🏓 Pong!"));
bot.command("start", (ctx) => ctx.reply("Bot aktif dengan webhook 🚀"));
const startTime = Date.now();

bot.command("uptime", (ctx) => {
  const uptime = Date.now() - startTime;
  const seconds = Math.floor(uptime / 1000) % 60;
  const minutes = Math.floor(uptime / (1000 * 60)) % 60;
  const hours = Math.floor(uptime / (1000 * 60 * 60));
  ctx.reply(`⏱ Bot uptime: ${hours}h ${minutes}m ${seconds}s`);
});

// set webhook otomatis (sekali jalan)
await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook?url=${URL}`);

const handleUpdate = webhookCallback(bot, "std/http");
Deno.serve(handleUpdate);
