// commands/dl.js
import { InputFile } from "npm:grammy";

const VERCEL_API_URL = Deno.env.get("VERCEL_API_URL");

export default (bot) => {
  bot.command("dl", async (ctx) => {
    const text = ctx.message?.text || "";
    const parts = text.split(" ");
    const targetUrl = parts[1];

    // 1. Validasi Input
    if (!targetUrl || !targetUrl.startsWith("http")) {
      return ctx.reply(
        "⚠️ *Format salah!*\n\nGunakan: `/dl <url>`\nContoh: `/dl https://vt.tiktok.com/ZSVGUNMoC/`",
        { parse_mode: "Markdown" }
      );
    }

    if (!VERCEL_API_URL) {
      return ctx.reply("❌ *Konfigurasi Server Error*\nAdmin belum mengatur VERCEL_API_URL di file .env", { parse_mode: "Markdown" });
    }

    // 2. Pesan Loading
    const loadingMsg = await ctx.reply("⏳ *Sedang memproses video...*\nMohon tunggu sebentar.", { parse_mode: "Markdown" });

    try {
      // 3. Minta Vercel API untuk mendapatkan URL video asli (bypass 403)
      const apiUrl = `${VERCEL_API_URL}/api/get_url?url=${encodeURIComponent(targetUrl)}`;
      const apiResponse = await fetch(apiUrl);
      const data = await apiResponse.json();

      if (data.status !== "success") {
        return ctx.api.editMessageText(ctx.chat.id, loadingMsg.message_id, `❌ *Gagal Memproses*\n${data.message}`, { parse_mode: "Markdown" });
      }

      const videoUrl = data.video_url;
      const title = data.title || "Video";

      await ctx.api.editMessageText(ctx.chat.id, loadingMsg.message_id, "📥 *Sedang mengunduh dari sumber...*", { parse_mode: "Markdown" });

      // 4. Deno mengunduh video dengan Header yang benar (Kunci agar tidak kena 403)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 detik timeout

      const videoResponse = await fetch(videoUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://www.tiktok.com/"
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!videoResponse.ok) {
        throw new Error(`Gagal mengunduh video: HTTP ${videoResponse.status}`);
      }

      await ctx.api.editMessageText(ctx.chat.id, loadingMsg.message_id, "📤 *Sedang mengirim ke Telegram...*", { parse_mode: "Markdown" });

      // 5. Kirim LANGSUNG sebagai Stream (InputFile) ke Telegram
      // Ini menghindari error "failed to get HTTP URL content" karena Telegram tidak perlu fetch URL sendiri
      const inputFile = new InputFile(videoResponse.body, `video_${Date.now()}.mp4`);
      
      await ctx.replyWithVideo(inputFile, {
        caption: `📥 *${title}*\n\n_Download via @FJRToolsBot_`,
        parse_mode: "Markdown",
        supports_streaming: true
      });

      // 6. Hapus pesan loading setelah berhasil
      await ctx.api.deleteMessage(ctx.chat.id, loadingMsg.message_id);

    } catch (error) {
      console.error("[DL Command Error]:", error);
      let errorMsg = "❌ Terjadi kesalahan tak terduga.";
      
      if (error.name === "AbortError" || error.message.includes("timeout")) {
        errorMsg = "⚠️ Waktu unduh habis. Video mungkin terlalu besar atau koneksi lambat.";
      } else if (error.message.includes("403") || error.message.includes("404")) {
        errorMsg = "❌ Gagal mengunduh: Link mungkin rusak, kedaluwarsa, atau diblokir oleh sumber.";
      }

      await ctx.api.editMessageText(ctx.chat.id, loadingMsg.message_id, errorMsg);
    }
  });
};