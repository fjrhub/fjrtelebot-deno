// index.js - SISI DENO (Worker Final)
import "jsr:@std/dotenv/load";
import { Bot } from "npm:grammy";

// 1. Ambil Token dari Environment Variables Deno Deploy
const TOKEN = Deno.env.get("TOKEN");
if (!TOKEN) {
  throw new Error("❌ TOKEN belum di-set di Environment Variables Deno Deploy!");
}

const bot = new Bot(TOKEN);

Deno.serve(async (req) => {
  const u = new URL(req.url);

  // 🟢 1. Handle GET Request (Buat cek status kalau dibuka di browser)
  if (req.method === "GET") {
    return json({ 
      status: "online", 
      worker: "deno-fjrtoolsbot",
      message: "Worker siap menerima kiriman dari Vercel." 
    });
  }

  // 🔵 2. Handle POST Request (Kiriman JSON dari Vercel)
  if (req.method === "POST") {
    let chatId, link;
    try {
      // Baca body sebagai text dulu biar gak langsung crash kalau body-nya kosong
      const bodyText = await req.text();
      if (!bodyText) return json({ error: "Body request kosong" }, 400);
      
      const b = JSON.parse(bodyText);
      chatId = b.chatId;
      link = b.url;

      // Kalau Vercel ngirim payload Telegram asli (ada object message)
      if (!chatId && b.message) {
        chatId = b.message.chat.id;
        const m = (b.message.text || "").match(/(https?:\/\/[^\s]+)/);
        link = m ? m[0] : null;
      }
    } catch (err) {
      return json({ error: "Format JSON salah / invalid", details: err.message }, 400);
    }

    // 🔥 Eksekusi kirim pesan ke Telegram
    if (chatId && link) {
      const numericChatId = Number(chatId); // Pastikan ID berupa angka
      try {
        await bot.api.sendMessage(
          numericChatId, 
          `✅ <b>Deno Worker Sukses!</b>\n\nURL diproses:\n<code>${link}</code>`, 
          { parse_mode: "HTML" }
        );
        return json({ ok: true, chatId: numericChatId, url: link });
      } catch (err) {
        // Kalau gagal kirim (misal user belum /start), balas error JSON
        return json({ ok: false, error: err.message, chatId: numericChatId }, 500);
      }
    }

    return json({ ok: false, error: "chatId atau url tidak ditemukan di body JSON" }, 400);
  }

  // Method lain (PUT, DELETE, dll) ditolak
  return json({ error: "Method tidak diizinkan" }, 405);
});

// Helper untuk merapikan balasan JSON
function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}