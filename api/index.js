// index.js — SISI DENO (worker / eksekutor)
import "jsr:@std/dotenv/load"; // ⬅️ WAJIB! Agar Deno bisa baca file .env saat test di laptop
import { Bot } from "npm:grammy";

// Baca Token murni dari Environment Variable. Tidak ada fallback!
    const TOKEN = Deno.env.get("TOKEN");

// Kalau env belum di-set, langsung hentikan biar ketahuan errornya
if (!TOKEN) {
  throw new Error("❌ TOKEN belum di-set! Cek file .env (lokal) atau Environment Variables (Deno Deploy).");
}

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

      // Kalau yang dikirim payload Telegram asli dari Vercel
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
    const numericChatId = Number(chatId); 
    
    try {
      await bot.api.sendMessage(numericChatId, `✅ Deno worker jalan!\n\nURL: ${link}`);
      return json({ ok: true, chatId: numericChatId, url: link });
    } catch (err) {
      return json({ ok: false, error: err.message, chatIdTercoba: numericChatId });
    }
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