import { InputFile } from "grammy"; // <-- PENTING: Tambahkan import ini

const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".bmp"];
const VIDEO_EXT = [".mp4", ".webm", ".mov", ".m4v", ".mkv", ".avi"];
const GIF_EXT = [".gif"];

function detectFromExtension(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (GIF_EXT.some((e) => pathname.endsWith(e))) return "animation";
    if (IMAGE_EXT.some((e) => pathname.endsWith(e))) return "photo";
    if (VIDEO_EXT.some((e) => pathname.endsWith(e))) return "video";
  } catch {
    // Ignore URL parsing errors
  }
  return null;
}

export default (bot) => {
  bot.command("send", async (ctx) => {
    const rawText = ctx.message?.text || "";
    const args = rawText.replace(/^\/send\s+/i, "").trim().split(/\s+/);

    if (args.length === 0 || !args[args.length - 1]) {
      return ctx.reply("⚠️ Format salah!\nGunakan: `/send [-img|-video|-gif] <url>`", { parse_mode: "Markdown" });
    }

    let forcedType = null;
    let url = "";

    if (args[0].startsWith("-")) {
      const flag = args[0].toLowerCase();
      if (flag === "-img") forcedType = "photo";
      else if (flag === "-video") forcedType = "video";
      else if (flag === "-gif") forcedType = "animation";
      else return ctx.reply("⚠️ Flag tidak dikenali. Gunakan `-img`, `-video`, atau `-gif`.");
      
      url = args.slice(1).join(" ");
    } else {
      url = args.join(" ");
    }

    if (!url) {
      return ctx.reply("⚠️ URL tidak ditemukan.");
    }

    try {
      new URL(url);
    } catch {
      return ctx.reply("❌ URL tidak valid. Pastikan diawali dengan http:// atau https://");
    }

    // 1. Hapus pesan perintah terlebih dahulu
    try {
      await ctx.deleteMessage();
    } catch (err) {
      console.log("Info: Gagal menghapus pesan (mungkin Private Chat atau bukan admin).");
    }

    try {
      // 2. Bot mengunduh file terlebih dahulu (Proxy)
      await ctx.replyWithChatAction("upload_video"); // Aksi umum sambil download

      const response = await fetch(url, {
        headers: {
          // User-Agent sering dibutuhkan oleh downloader API agar tidak diblokir
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        },
      });

      if (!response.ok) {
        throw new Error(`Gagal mengunduh: HTTP ${response.status} ${response.statusText}`);
      }

      // Cek Content-Type dari response API
      const contentType = response.headers.get("content-type") || "";
      
      // Tentukan tipe media: Prioritas ke forcedType, lalu cek contentType, lalu ekstensi URL
      let mediaType = forcedType;
      if (!mediaType) {
        if (contentType.includes("image/gif")) mediaType = "animation";
        else if (contentType.includes("image/")) mediaType = "photo";
        else if (contentType.includes("video/")) mediaType = "video";
        else mediaType = detectFromExtension(url) || "video"; // Fallback terakhir
      }

      // Tentukan ekstensi file untuk nama file (Telegram lebih suka file dengan ekstensi)
      let ext = ".bin";
      if (mediaType === "photo") ext = ".jpg";
      else if (mediaType === "animation") ext = ".gif";
      else if (mediaType === "video") ext = ".mp4";

      // 3. Ubah response stream menjadi InputFile Grammy
      // Menggunakan response.body (ReadableStream) agar hemat memori (tidak dimuat penuh ke RAM)
      const inputFile = new InputFile(response.body, `media_${Date.now()}${ext}`);

      const sender = ctx.from;
      const displayName = sender?.username ? `@${sender.username}` : sender?.first_name || "Unknown";
      const caption = `Sender: <a href="tg://user?id=${sender?.id}">${displayName}</a>`;
      const options = { caption, parse_mode: "HTML" };

      // 4. Kirim file berdasarkan tipe
      if (mediaType === "photo") {
        await ctx.replyWithPhoto(inputFile, options);
      } else if (mediaType === "animation") {
        await ctx.replyWithAnimation(inputFile, options);
      } else {
        await ctx.replyWithVideo(inputFile, { ...options, supports_streaming: true });
      }

    } catch (error) {
      console.error("Failed to process/send media:", error);
      const desc = error.description || error.message || "";

      if (desc.includes("Gagal mengunduh")) {
        return ctx.reply("⚠️ Gagal mengunduh dari URL.\nAPI Downloader mungkin sedang down atau link sudah kedaluwarsa.");
      }
      
      if (desc.includes("request entity too large") || desc.includes("file is too big")) {
        return ctx.reply("⚠️ File terlalu besar! Maksimal ukuran upload langsung adalah 50MB.");
      }

      ctx.reply(`❌ Gagal: ${desc}`);
    }
  });
};