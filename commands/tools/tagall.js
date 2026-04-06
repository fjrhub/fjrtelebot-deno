const escapeHtml = (text) => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

export default (bot) => {
  bot.command("start", (ctx) => {
    ctx.reply("Bot aktif 🚀");
  });

  bot.command("tagall", async (ctx) => {
    const chatId = ctx.chat?.id;
    const chatType = ctx.chat?.type;

    // Validasi hanya di grup/supergroup
    if (!chatId || !["group", "supergroup"].includes(chatType)) {
      return ctx.reply("❌ Perintah ini hanya bisa digunakan di grup/supergroup.");
    }

    try {
      const admins = await ctx.api.getChatAdministrators(chatId);
      const humanAdmins = admins.filter(a => !a.user.is_bot);

      // Ambil teks kustom jika ada (contoh: /tagall Jangan lupa meeting!)
      const customText = ctx.match?.trim() || "📢 <b>TAG ALL</b>";
      const header = `${customText}\n\n`;

      // Format mention: <a href="tg://user?id=ID">Nama</a>
      let mentions = "";
      for (const admin of humanAdmins) {
        const name = `${admin.user.first_name}${admin.user.last_name ? ` ${admin.user.last_name}` : ""}`;
        mentions += `<a href="tg://user?id=${admin.user.id}">${escapeHtml(name)}</a> `;
      }

      if (!mentions.trim()) {
        return ctx.reply("⚠️ Tidak ditemukan admin manusia di grup ini.");
      }

      // Telegram membatasi pesan maksimal 4096 karakter
      const maxLength = 4096;
      const parts = [];
      let currentPart = header;
      const mentionArray = mentions.trim().split(" ");

      for (const mention of mentionArray) {
        if ((currentPart + " " + mention).length > maxLength) {
          parts.push(currentPart.trim());
          currentPart = header + mention;
        } else {
          currentPart += " " + mention;
        }
      }
      if (currentPart.trim().length > header.trim().length) {
        parts.push(currentPart.trim());
      }

      // Kirim pesan berurutan dengan delay anti-flood
      for (let i = 0; i < parts.length; i++) {
        await ctx.reply(parts[i], { parse_mode: "HTML" });
        if (i < parts.length - 1) {
          await new Promise((res) => setTimeout(res, 1000)); // Delay 1 detik
        }
      }
    } catch (error) {
      console.error("Error di /tagall:", error);
      ctx.reply("❌ Gagal menjalankan perintah. Pastikan bot adalah <b>admin</b> grup dan memiliki izin mengirim pesan.");
    }
  });
};