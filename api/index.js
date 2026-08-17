import { Bot } from "npm:grammy";

// 1. Ambil Token langsung dari Environment Deno Deploy (Tanpa dotenv!)
const TOKEN = Deno.env.get("TOKEN");

// Kalau token belum di-set di dashboard Deno Deploy, kasih warning di log
if (!TOKEN) {
  console.error("⚠️ PERINGATAN: TOKEN belum di-set di Environment Variables!");
}

const bot = new Bot(TOKEN);

Deno.serve(async (req) => {
  const u = new URL(req.url);

  // 🟢 Handle GET (Buat cek status di browser)
  if (req.method === "GET") {
    return Response.json({ 
      status: "online", 
      worker: "deno-fjrtoolsbot",
      message: "Worker siap! Kirim POST dari Vercel." 
    });
  }

  // 🔵 Handle POST (Kiriman dari Vercel)
  if (req.method === "POST") {
    let chatId, link;
    
    try {
      const bodyText = await req.text();
      if (!bodyText) return Response.json({ error: "Body kosong" }, { status: 400 });
      
      const b = JSON.parse(bodyText);
      chatId = b.chatId;
      link = b.url;

      // Ekstrak dari payload Telegram asli (kalau Vercel kirim mentahan)
      if (!chatId && b.message) {
        chatId = b.message.chat.id;
        const m = (b.message.text || "").match(/(https?:\/\/[^\s]+)/);
        link = m ? m[0] : null;
      }
    } catch (err) {
      return Response.json({ error: "JSON Invalid", details: err.message }, { status: 400 });
    }

    // 🔥 Eksekusi kirim ke Telegram
    if (chatId && link && TOKEN) {
      const numericChatId = Number(chatId);
      try {
        await bot.api.sendMessage(
          numericChatId, 
          `✅ <b>Deno Worker Sukses!</b>\n\nURL diproses:\n<code>${link}</code>`, 
          { parse_mode: "HTML" }
        );
        return Response.json({ ok: true, chatId: numericChatId, url: link });
      } catch (err) {
        return Response.json({ ok: false, error: err.message, chatId: numericChatId }, { status: 500 });
      }
    }

    return Response.json({ ok: false, error: "chatId/url tidak ditemukan atau TOKEN kosong" }, { status: 400 });
  }

  return Response.json({ error: "Method tidak diizinkan" }, { status: 405 });
});