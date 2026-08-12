export default (bot) => {
  // Command start untuk pengecekan status
  bot.command("start", (ctx) => {
    ctx.reply("Bot aktif 🚀\n\nGunakan: /send <url_video>");
  });

  // Handler untuk command /send
  bot.command("send", async (ctx) => {
    const url = ctx.match?.[1]?.trim();

    // Validasi jika URL tidak disertakan
    if (!url) {
      return ctx.reply("⚠️ Format salah!\nGunakan: /send <url_video>");
    }

    // Validasi format URL sederhana
    try {
      new URL(url);
    } catch {
      return ctx.reply("❌ URL tidak valid. Pastikan link lengkap (https://...)");
    }

    try {
      // Kirim status "uploading" agar user tahu sedang diproses
      await ctx.sendChatAction("upload_video");

      // Kirim video langsung dari URL
      // Telegram mendukung streaming langsung dari URL publik tanpa download manual
      await ctx.replyWithVideo(url, {
        caption: `📹 Video dari: ${url}`,
        supports_streaming: true,
      });

    } catch (error) {
      console.error("Gagal mengirim video:", error);
      
      // Fallback: jika gagal sebagai video, coba kirim sebagai dokumen/link
      if (error.description?.includes("wrong file identifier") || 
          error.description?.includes("Failed to get HTTP URL content")) {
        return ctx.reply(
          `⚠️ Tidak bisa mengirim sebagai video.\n` +
          `Kemungkinan URL bukan video langsung atau server menolak akses.\n\n` +
          `Link: ${url}`
        );
      }
      
      ctx.reply(`❌ Gagal mengirim video: ${error.description || error.message}`);
    }
  });
};