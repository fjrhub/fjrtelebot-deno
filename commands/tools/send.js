import { InputFile } from "npm:grammy";

const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".bmp"];
const VIDEO_EXT = [".mp4", ".webm", ".mov", ".m4v", ".mkv", ".avi"];
const GIF_EXT = [".gif"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (Batas Telegram Bot API)

function detectTypeFromExtension(url) {
  const pathname = new URL(url).pathname.toLowerCase();
  if (GIF_EXT.some((e) => pathname.endsWith(e))) return "animation";
  if (IMAGE_EXT.some((e) => pathname.endsWith(e))) return "photo";
  if (VIDEO_EXT.some((e) => pathname.endsWith(e))) return "video";
  return "video"; // Fallback default
}

export default (bot) => {
  bot.command("send", async (ctx) => {
    const rawText = ctx.message?.text || "";
    
    // Parsing yang lebih robust: menangkap flag opsional dan sisa string sebagai URL
    const match = rawText.match(/^\/send\s+(-img|-video|-gif)?\s*(.+)$/i);
    if (!match || !match[2]?.trim()) {
      return ctx.reply("⚠️ Format salah!\nGunakan: `/send [-img|-video|-gif] <url>`", { parse_mode: "Markdown" });
    }

    const flag = match[1]?.toLowerCase();
    const url = match[2].trim();

    let forcedType = null;
    if (flag === "-img") forcedType = "photo";
    else if (flag === "-video") forcedType = "video";
    else if (flag === "-gif") forcedType = "animation";
    else if (flag) {
      return ctx.reply("⚠️ Flag tidak dikenali. Gunakan `-img`, `-video`, atau `-gif`.");
    }

    try {
      new URL(url);
    } catch {
      return ctx.reply("❌ URL tidak valid. Pastikan diawali dengan http:// atau https://");
    }

    // 1. Hapus pesan perintah
    try {
      await ctx.deleteMessage();
    } catch {
      // Abaikan error jika di private chat atau bukan admin
    }

    try {
      // 2. Fetch dengan Timeout dan Validasi Ukuran
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 detik timeout

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      // Validasi Content-Length jika tersedia (Fail-fast)
      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
        return ctx.reply("⚠️ File terlalu besar! Maksimal ukuran upload adalah 50MB.");
      }

      // 3. Deteksi Tipe Media
      const contentType = response.headers.get("content-type") || "";
      let mediaType = forcedType;
      
      if (!mediaType) {
        if (contentType.includes("image/gif")) mediaType = "animation";
        else if (contentType.includes("image/")) mediaType = "photo";
        else if (contentType.includes("video/")) mediaType = "video";
        else mediaType = detectTypeFromExtension(url);
      }

      // 4. Tentukan Ekstensi & Chat Action
      const extMap = { photo: ".jpg", animation: ".gif", video: ".mp4" };
      const ext = extMap[mediaType] || ".bin";
      const actionMap = { photo: "upload_photo", animation: "upload_video", video: "upload_video" };
      
      await ctx.replyWithChatAction(actionMap[mediaType] || "upload_video");

      // 5. Proses dan Kirim
      const inputFile = new InputFile(response.body, `media_${Date.now()}${ext}`);
      const sender = ctx.from;
      const displayName = sender?.username ? `@${sender.username}` : sender?.first_name || "Unknown";
      const caption = `Sender: <a href="tg://user?id=${sender?.id}">${displayName}</a>`;
      const options = { caption, parse_mode: "HTML" };

      if (mediaType === "photo") {
        await ctx.replyWithPhoto(inputFile, options);
      } else if (mediaType === "animation") {
        await ctx.replyWithAnimation(inputFile, options);
      } else {
        await ctx.replyWithVideo(inputFile, { ...options, supports_streaming: true });
      }

    } catch (error) {
      console.error("Failed to process/send media:", error);
      const desc = error.message || "";

      if (desc.includes("aborted") || desc.includes("timeout")) {
        return ctx.reply("⚠️ Waktu unduh habis. Server target terlalu lambat atau tidak merespons.");
      }
      if (desc.includes("404") || desc.includes("403")) {
        return ctx.reply("❌ Gagal mengunduh: Link mungkin rusak, kedaluwarsa, atau diblokir.");
      }
      if (desc.includes("entity too large") || desc.includes("too big")) {
        return ctx.reply("⚠️ File terlalu besar! Maksimal ukuran upload adalah 50MB.");
      }

      ctx.reply(`❌ Gagal memproses: ${desc.substring(0, 100)}`);
    }
  });
};