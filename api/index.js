import { Bot } from "npm:grammy";

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const chatId = u.searchParams.get("chatId");
  const url = u.searchParams.get("url");
  const TOKEN = Deno.env.get("TOKEN");

  // Print ke Logs Deno Deploy biar kelihatan kalau ada request masuk
  console.log(`[DEBUG] Ada request masuk! Method: ${req.method} | ChatID: ${chatId} | URL: ${url} | Token Ada?: ${!!TOKEN}`);

  // Kalau dibuka di browser tanpa parameter
  if (!chatId || !url) {
    return new Response("✅ Server Deno HIDUP! Tambahkan ?chatId=xxx&url=yyy di URL.");
  }

  // Kalau Token belum di-set di Environment Variables
  if (!TOKEN) {
    return new Response("❌ ERROR: BOT_TOKEN kosong di Environment Variables Deno Deploy!", { status: 500 });
  }

  // Coba kirim pesan
  try {
    const bot = new Bot(TOKEN);
    await bot.api.sendMessage(chatId, `🚀 Tes langsung dari Deno Deploy!\nURL: ${url}`);
    return new Response("✅ SUKSES! Cek Telegram Mas-nya sekarang.", { status: 200 });
  } catch (err) {
    console.error("[ERROR TELEGRAM]", err.message);
    return new Response("❌ Gagal kirim ke Telegram: " + err.message, { status: 500 });
  }
});