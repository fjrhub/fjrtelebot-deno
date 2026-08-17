// index.js — SISI DENO (worker / eksekutor)
import { Bot } from "npm:grammy";

// Lokal: tempel token di sini buat testing.
// Deploy: ganti jadi "" lalu set BOT_TOKEN di dashboard Deno Deploy (biar gak bocor ke GitHub).
const TOKEN = Deno.env.get("BOT_TOKEN") || "TEMPEL_TOKEN_DISINI";
const bot = new Bot(TOKEN);

Deno.serve(async (req) => {
  const u = new URL(req.url);
  let chatId = u.searchParams.get("chatId");
  let link = u.searchParams.get("url");

  // Kiriman POST dari Vercel (JSON)
  if (req.method === "POST") {
    try {
      const b = await req.json();
      chatId = b.chatId || chatId;
      link = b.url || link;

      // Kalau yang dikirim payload Telegram asli, ekstrak chatId + url
      if (!chatId && b.message) {
        chatId = b.message.chat.id;
        const m = (b.message.text || "").match(/(https?:\/\/[^\s]+)/);
        link = m ? m[0] : null;
      }
    } catch {
      // body bukan JSON → abaikan
    }
  }

  // Ada chatId + url → eksekusi & balas ke Telegram
  if (chatId && link) {
    // 🔥 Taruh logika berat kamu di sini nanti (download/scrape/dll)
    await bot.api.sendMessage(chatId, `✅ Deno worker jalan!\n\nURL: ${link}`);
    return json({ ok: true, chatId, url: link });
  }

  // Selain itu → status online
  return json({ status: "online", worker: "deno" });
});

// Helper response JSON
function json(data) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}