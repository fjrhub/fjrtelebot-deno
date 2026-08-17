import { Bot } from "npm:grammy";

const token = Deno.env.get("TOKEN");
const bot = new Bot(token || "");

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const chatId = url.searchParams.get("chatId");
  const link = url.searchParams.get("url");

  // Kalau ada chatId dan url, langsung kirim ke Telegram
  if (chatId && link) {
    try {
      await bot.api.sendMessage(chatId, `✅ SUKSES! Deno Worker jalan.\n\nURL: ${link}`);
      return new Response("✅ Pesan terkirim ke Telegram. Cek HP Mas-nya!", { status: 200 });
    } catch (err) {
      return new Response("❌ Gagal kirim Telegram: " + err.message, { status: 500 });
    }
  }

  // Kalau dibuka biasa di browser tanpa parameter
  return new Response("Server Deno Online. Pakai ?chatId=ID&url=LINK", { status: 200 });
});