import "jsr:@std/dotenv/load";
import { webhookCallback, Bot } from "npm:grammy";
import { kv } from "./kv.js";

const bot = new Bot(Deno.env.get("TOKEN"));

// 🔥 COMMAND KHUSUS: Hapus SELURUH isi database KV
bot.command("nuke", async (ctx) => {
  await ctx.reply("⏳ Sedang menghapus seluruh database KV... Mohon tunggu.");
  let count = 0;
  try {
    // prefix: [] artinya ambil SEMUA key di database tanpa terkecuali
    for await (const entry of kv.list({ prefix: [] })) {
      await kv.delete(entry.key);
      count++;
    }
    await ctx.reply(`✅ BERHASIL! Seluruh database KV telah dibersihkan.\nTotal: ${count} data dihapus.\n\nSekarang kamu bisa mengembalikan kode index.js ke versi normal dan deploy ulang.`);
  } catch (err) {
    console.error("[Nuke] Error:", err);
    await ctx.reply(`❌ Gagal menghapus database: ${err.message}`);
  }
});

// Command tes biasa
bot.command("ping", (ctx) => ctx.reply("🏓 Pong! Bot hidup, database sedang mode maintenance."));
bot.command("start", (ctx) => ctx.reply("✅ Bot is working! Ketik /nuke untuk membersihkan database yang korup."));

const handleUpdate = webhookCallback(bot, "std/http", {
  onTimeout: "return",
  timeoutMilliseconds: 10000,
});

Deno.serve(handleUpdate);