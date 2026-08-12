const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".bmp"];
const VIDEO_EXT = [".mp4", ".webm", ".mov", ".m4v", ".mkv", ".avi"];
const GIF_EXT = [".gif"];

// Deteksi dari ekstensi file (query params otomatis diabaikan via pathname)
function detectFromExtension(url) {
  const pathname = new URL(url).pathname.toLowerCase();
  if (GIF_EXT.some((e) => pathname.endsWith(e))) return "animation";
  if (IMAGE_EXT.some((e) => pathname.endsWith(e))) return "photo";
  if (VIDEO_EXT.some((e) => pathname.endsWith(e))) return "video";
  return null;
}

// Fallback: cek Content-Type header jika ekstensi tidak dikenali
async function detectFromHeaders(url) {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const type = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (type === "image/gif") return "animation";
    if (type.startsWith("image/")) return "photo";
    if (type.startsWith("video/")) return "video";
  } catch {
    // CDN menolak HEAD request → ignore, pakai default
  }
  return null;
}

export default (bot) => {
  bot.command("start", (ctx) => {
    ctx.reply("Bot active 🚀\n\nUsage: /send <media_url>\nSupports: video, image, GIF");
  });

  bot.command("send", async (ctx) => {
    const rawText = ctx.message?.text || "";
    const url = rawText.replace(/^\/send\s+/i, "").trim();

    if (!url) {
      return ctx.reply("⚠️ Invalid format!\nUsage: /send <media_url>");
    }

    try {
      new URL(url);
    } catch {
      return ctx.reply("❌ Invalid URL. Make sure the link is complete (https://...)");
    }

    try {
      // Urutan deteksi: ekstensi → HEAD request → default video
      const mediaType =
        detectFromExtension(url) ?? (await detectFromHeaders(url)) ?? "video";

      await ctx.replyWithChatAction(
        mediaType === "photo" ? "upload_photo" : "upload_video"
      );

      const sender = ctx.from;
      let caption = "Sender: Unknown";
      if (sender) {
        const displayName = sender.username ? `@${sender.username}` : sender.first_name;
        caption = `Sender: <a href="tg://user?id=${sender.id}">${displayName}</a>`;
      }

      const options = { caption, parse_mode: "HTML" };

      const sendByType = (type) => {
        if (type === "photo") return ctx.replyWithPhoto(url, options);
        if (type === "animation") return ctx.replyWithAnimation(url, options);
        return ctx.replyWithVideo(url, { ...options, supports_streaming: true });
      };

      try {
        await sendByType(mediaType);
      } catch (firstErr) {
        // Fallback cross-type: aman karena attempt pertama tidak mengirim apa pun
        console.warn("Retrying with alternate media type:", firstErr.description);
        await sendByType(mediaType === "photo" ? "video" : "photo");
      }

      try {
        await ctx.deleteMessage();
      } catch (deleteErr) {
        console.warn("Failed to delete user message:", deleteErr.description);
      }
    } catch (error) {
      console.error("Failed to send media:", error);

      const desc = error.description || error.message || "";

      if (
        desc.includes("wrong file identifier") ||
        desc.includes("Failed to get HTTP URL content") ||
        desc.includes("Bad Request: invalid") ||
        desc.includes("not found")
      ) {
        return ctx.reply(
          "⚠️ Cannot send as media.\nThe URL may not be a direct link or has expired."
        );
      }

      ctx.reply(`❌ Failed: ${desc}`);
    }
  });
};