// Escape karakter HTML untuk keamanan
const escapeHtml = (text) => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

export default (bot) => {
  bot.command("tagall", async (ctx) => {
    const chatId = ctx.chat?.id;
    const chatType = ctx.chat?.type;

    // 1️⃣ Validasi hanya di grup/supergroup
    if (!chatId || !["group", "supergroup"].includes(chatType)) {
      return ctx.reply("❌ Perintah ini hanya dapat digunakan di grup atau supergroup.");
    }

    // 2️⃣ Wajib ada teks setelah /tagall
    const customText = ctx.match?.trim();
    if (!customText) {
      return ctx.reply("⚠️ Harap sertakan pesan setelah `/tagall`.\nContoh: `/tagall Meeting jam 8`", { parse_mode: "Markdown" });
    }

    try {
      // 📌 CATATAN API: Telegram hanya mengizinkan bot mengambil daftar ADMIN grup.
      // Untuk tag SEMUA member, lihat panduan cache di bagian bawah.
      const admins = await ctx.api.getChatAdministrators(chatId);
      const targets = admins.filter(
        (a) => !a.user.is_bot && a.user.id !== ctx.from?.id
      );

      // 3️⃣ Format mention: Prioritas @username, fallback ke link aman
      let mentions = "";
      for (const user of targets) {
        if (user.user.username) {
          mentions += `@${user.user.username} `;
        } else {
          // Fallback jika user tidak punya username
          const name = escapeHtml(user.user.first_name || "Member");
          mentions += `<a href="tg://user?id=${user.user.id}">${name}</a> `;
        }
      }

      if (!mentions.trim()) {
        return ctx.reply("⚠️ Tidak ditemukan member lain untuk di-tag.");
      }

      // 4️⃣ Tag pengirim (prioritas @username)
      const senderTag = ctx.from?.username
        ? `@${ctx.from.username}`
        : `<a href="tg://user?id=${ctx.from?.id}">${escapeHtml(ctx.from?.first_name || "User")}</a>`;

      // 5️⃣ Susun pesan friendly
      const fullMessage = `📢 <b>Announcement</b>

${escapeHtml(customText)}

👤 <b>Sent by:</b> ${senderTag}
🔔 <b>Tagged:</b> ${mentions.trim()}`;

      // 6️⃣ Auto-split jika > 4096 karakter
      const maxLength = 4096;
      const parts = [];
      let currentPart = "";
      const words = fullMessage.split(/\s+/);

      for (const word of words) {
        if ((currentPart + " " + word).length > maxLength) {
          parts.push(currentPart.trim());
          currentPart = word;
        } else {
          currentPart += (currentPart ? " " : "") + word;
        }
      }
      if (currentPart) parts.push(currentPart);

      // 7️⃣ Kirim dengan delay anti-flood
      for (let i = 0; i < parts.length; i++) {
        await ctx.reply(parts[i], { parse_mode: "HTML" });
        if (i < parts.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay 1 detik
        }
      }
    } catch (error) {
      console.error("❌ Tagall Error:", error);
      ctx.reply("❌ Gagal menjalankan perintah. Pastikan bot adalah <b>admin</b> grup dan memiliki izin kirim pesan.");
    }
  });
};