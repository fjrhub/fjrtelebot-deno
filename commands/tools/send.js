export default (bot) => {
  bot.command("send", async (ctx) => {
    const rawText = ctx.message?.text || "";
    const url = rawText.replace(/^\/send\s+/i, "").trim();

    if (!url) {
      return ctx.reply("⚠️ Format salah!\nGunakan: /send <url_video>");
    }

    try {
      new URL(url);
    } catch {
      return ctx.reply("❌ URL tidak valid. Pastikan link lengkap (https://...)");
    }

    try {
      await ctx.replyWithChatAction("upload_video");

      // ✅ Caption hanya tag sender
      const sender = ctx.from;
      const caption = sender
        ? `<a href="tg://user?id=${sender.id}">${sender.first_name}</a>`
        : "Unknown";

      // ✅ Kirim video dulu
      await ctx.replyWithVideo(url, {
        caption,
        parse_mode: "HTML",
        supports_streaming: true,
      });

      // ✅ Hapus pesan command user setelah berhasil dikirim
      try {
        await ctx.deleteMessage();
      } catch (deleteErr) {
        // Bot mungkin tidak punya izin delete di grup, silent ignore
        console.warn("Gagal menghapus pesan user:", deleteErr.description);
      }
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
          `⚠️ Tidak bisa mengirim sebagai video.\nURL mungkin bukan direct link atau sudah expired.`
        );
      }

      ctx.reply(`❌ Gagal: ${desc}`);
    }
  });
};