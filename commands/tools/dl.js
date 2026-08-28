// commands/dl.js (atau .ts)

const VERCEL_API_URL = Deno.env.get("VERCEL_API_URL");

export default (bot) => {
  bot.command("dl", async (ctx) => {
    // 1. Ambil URL dari pesan (Format: /dl <url>)
    const text = ctx.message?.text || "";
    const parts = text.split(" ");
    const targetUrl = parts[1];

    // 2. Validasi input
    if (!targetUrl || !targetUrl.startsWith("http")) {
      return ctx.reply(
        "⚠️ *Format salah!*\n\n" +
        "Gunakan: `/dl <url_video>`\n" +
        "Contoh: `/dl https://vt.tiktok.com/ZSVGUNMoC/`",
        { parse_mode: "Markdown" }
      );
    }

    // 3. Validasi konfigurasi .env
    if (!VERCEL_API_URL) {
      return ctx.reply("❌ *Konfigurasi Server Error*\nAdmin belum mengatur VERCEL_API_URL di .env", { parse_mode: "Markdown" });
    }

    // 4. Kirim pesan loading
    const loadingMsg = await ctx.reply("⏳ *Sedang memproses video...*\nMohon tunggu sebentar.", { parse_mode: "Markdown" });

    try {
      // 5. Request ke Vercel API
      const apiUrl = `${VERCEL_API_URL}/api/get_url?url=${encodeURIComponent(targetUrl)}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          "User-Agent": "FJRToolsBot/1.0 (Telegram Bot)"
        }
      });
      
      const data = await response.json();

      if (data.status !== "success") {
        return ctx.api.editMessageText(
          ctx.chat.id, 
          loadingMsg.message_id, 
          `❌ *Gagal Memproses*\n${data.message}`, 
          { parse_mode: "Markdown" }
        );
      }

      // 6. Tentukan URL final (Gunakan stream_url agar tidak kena 403 dari TikTok)
      // Jika stream_url relatif, gabungkan dengan VERCEL_API_URL
      const finalVideoUrl = data.stream_url.startsWith("http") 
        ? data.stream_url 
        : `${VERCEL_API_URL}${data.stream_url}`;

      // 7. Update status loading
      await ctx.api.editMessageText(
        ctx.chat.id, 
        loadingMsg.message_id, 
        "📤 *Sedang mengirim video...*", 
        { parse_mode: "Markdown" }
      );

      // 8. Kirim Video ke Telegram
      // Grammy bisa langsung menerima string URL untuk replyWithVideo
      await ctx.replyWithVideo(finalVideoUrl, {
        caption: `📥 *${data.title || "Video"}*\n\n_Download via @FJRToolsBot_`,
        parse_mode: "Markdown",
        supports_streaming: true
      });

      // 9. Hapus pesan loading setelah berhasil
      await ctx.api.deleteMessage(ctx.chat.id, loadingMsg.message_id);

    } catch (error) {
      console.error("[DL Command Error]:", error);
      
      let errorMsg = "❌ Terjadi kesalahan tak terduga saat memproses video.";
      if (error.message.includes("fetch")) {
        errorMsg = "❌ Gagal menghubungi server extractor. Coba lagi nanti.";
      }

      await ctx.api.editMessageText(ctx.chat.id, loadingMsg.message_id, errorMsg);
    }
  });
};