import "jsr:@std/dotenv/load";
import { Bot } from "npm:grammy";

const TOKEN = Deno.env.get("TOKEN");

if (!TOKEN) {
  throw new Error("TOKEN tidak ditemukan di environment");
}

const bot = new Bot(TOKEN);

// command
bot.command("ping", (ctx) => ctx.reply("🏓 Pong!"));
bot.command("halo", (ctx) => ctx.reply("Halo juga!"));
bot.command("start", (ctx) => ctx.reply("Bot aktif dengan polling 🚀"));

// start polling
bot.start();