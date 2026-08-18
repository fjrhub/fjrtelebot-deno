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

async function detectFromHeaders(url) {
  try {
    const res = await fetch(url, { method: "HEAD", headers: { "User-Agent": "Mozilla/5.0" } });
    const type = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (type === "image/gif") return "animation";
    if (type.startsWith("image/")) return "photo";
    if (type.startsWith("video/")) return "video";
  } catch {
    // Ignore fetch errors
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
      // Catatan: Bot TIDAK BISA menghapus pesan di Private Chat (DM).
      // Ini hanya akan berhasil di Group di mana bot adalah Admin.
      console.log("Info: Gagal menghapus pesan (mungkin Private Chat atau bukan admin).");
    }

    try {
      const detectedType = detectFromExtension(url) ?? (await detectFromHeaders(url));
      
      // Susun prioritas tipe yang akan dicoba
      const typesToTry = [];
      if (forcedType) typesToTry.push(forcedType);
      if (detectedType && !typesToTry.includes(detectedType)) typesToTry.push(detectedType);
      
      // Tambahkan fallback jika tipe utama gagal
      ["video", "photo", "animation"].forEach(t => {
        if (!typesToTry.includes(t)) typesToTry.push(t);
      });

      // Hapus duplikat
      const uniqueTypes = [...new Set(typesToTry)];

      const sender = ctx.from;
      const displayName = sender?.username ? `@${sender.username}` : sender?.first_name || "Unknown";
      const caption = `Sender: <a href="tg://user?id=${sender?.id}">${displayName}</a>`;
      const options = { caption, parse_mode: "HTML" };

      const sendByType = async (type) => {
        if (type === "photo") return await ctx.replyWithPhoto(url, options);
        if (type === "animation") return await ctx.replyWithAnimation(url, options);
        return await ctx.replyWithVideo(url, { ...options, supports_streaming: true });
      };

      let lastError = null;
      let success = false;

      // 2. Coba kirim berdasarkan prioritas, fallback jika error "wrong type"
      for (const type of uniqueTypes) {
        try {
          await ctx.replyWithChatAction(type === "photo" ? "upload_photo" : "upload_video");
          await sendByType(type);
          success = true;
          break; // Berhasil, hentikan loop
        } catch (err) {
          lastError = err;
          const desc = err.description || "";
          
          // Jika errornya BUKAN karena tipe file salah, hentikan percobaan (misal URL mati total)
          if (!desc.includes("wrong type of the web page content") && 
              !desc.includes("Failed to get HTTP URL content")) {
            break;
          }
          // Jika error tipe salah, loop akan lanjut ke tipe berikutnya (fallback)
        }
      }

      if (!success) {
        throw lastError;
      }

    } catch (error) {
      console.error("Failed to send media:", error);
      const desc = error.description || error.message || "";

      if (desc.includes("wrong file identifier") || desc.includes("Failed to get HTTP URL content") || desc.includes("wrong type of the web page content")) {
        return ctx.reply("⚠️ Gagal mengirim media.\nPastikan URL adalah **direct link** (berakhiran .jpg, .mp4, dll), bukan link halaman web (seperti Twitter/Instagram/YouTube).");
      }

      ctx.reply(`❌ Gagal: ${desc}`);
    }
  });
};