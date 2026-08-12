export default (bot) => {
  bot.command("start", (ctx) => {
    ctx.reply("Bot aktif 🚀\n\nGunakan: /send <url_video>");
  });

  bot.command("send", async (ctx) => {
    // Ambil seluruh teks setelah "/send " secara manual
    const rawText = ctx.message?.text || "";
    const url = rawText.replace(/^\/send\s+/i, "").trim();

    if (!url) {
      return ctx.reply("⚠️ Format salah!\nGunakan: /send <url_video>");
    }

    // Validasi URL
    try {
      new URL(url);
    } catch {
      return ctx.reply("❌ URL tidak valid. Pastikan link lengkap (https://...)");
    }

    try {
      // ✅ Grammy menggunakan replyWithChatAction, bukan sendChatAction
      await ctx.replyWithChatAction("upload_video");

      await ctx.replyWithVideo(url, {
        caption: "📹 Video dikirim via /send",
        supports_streaming: true,
      });
    } catch (error) {
      console.error("Gagal mengirim video:", error);

      const desc = error.description || error.message || "";

      if (
        desc.includes("wrong file identifier") ||
        desc.includes("Failed to get HTTP URL content") ||
        desc.includes("Bad Request: invalid") ||
        desc.includes("not found")
      ) {
        return ctx.reply(
          `⚠️ Tidak bisa mengirim sebagai video.\n` +
            `URL mungkin bukan direct video link atau sudah expired.\n\n` +
            `Link: ${url}`
        );
      }

      ctx.reply(`❌ Gagal: ${desc}`);
    }
  });
};