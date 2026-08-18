// api/index.js — WORKER endpoint (dipanggil dari index.js root)
import { bot } from "../bot.js";

export async function handleApiRequest(req) {
  const u = new URL(req.url);
  let chatId = u.searchParams.get("chatId");
  let link = u.searchParams.get("url");

  // Support POST JSON (kiriman dari Vercel)
  if (req.method === "POST") {
    try {
      const b = await req.json();
      chatId = b.chatId || chatId;
      link = b.url || link;

      // Kalau Vercel kirim payload Telegram mentah
      if (!chatId && b.message) {
        chatId = b.message.chat.id;
        const m = (b.message.text || "").match(/(https?:\/\/[^\s]+)/);
        link = m ? m[0] : null;
      }
    } catch {
      // body bukan JSON → abaikan
    }
  }

  // 🔥 Eksekusi: kirim pesan ke Telegram
  if (chatId && link) {
    try {
      await bot.api.sendMessage(
        chatId,
        `✅ <b>Deno Worker Sukses!</b>\n\nURL diproses:\n<code>${link}</code>`,
        { parse_mode: "HTML" }
      );
      return json({ ok: true, chatId, url: link });
    } catch (err) {
      return json({ ok: false, error: err.message }, 500);
    }
  }

  return json({ ok: false, error: "chatId / url tidak ditemukan" }, 400);
}

// Helper response JSON
function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}