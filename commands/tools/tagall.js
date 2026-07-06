const escapeMDV2 = (text) => {
  if (!text) return '';
  // PERBAIKAN: Tambahkan \\ pada regex agar backslash juga ter-escape
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
};

export default (bot) => {
  bot.command('tagall', async (ctx) => {
    if (!['group', 'supergroup'].includes(ctx.chat?.type)) {
      return ctx.reply('❌ _Perintah ini hanya bisa digunakan di grup\\._', { parse_mode: 'MarkdownV2' });
    }

    const text = ctx.match?.trim();
    if (!text) {
      return ctx.reply('⚠️ _Contoh:_ `/tagall Rapat jam 8 malam`', { parse_mode: 'MarkdownV2' });
    }

    try {
      // Tanpa DB, kita hanya bisa men-tag Admin karena Telegram API membatasi fetch semua member
      const admins = await ctx.api.getChatAdministrators(ctx.chat.id);
      const targets = admins.filter((a) => !a.user.is_bot && a.user.id !== ctx.from.id);

      if (targets.length === 0) {
        return ctx.reply('⚠️ _Tidak ada anggota lain yang bisa di-tag\\._', { parse_mode: 'MarkdownV2' });
      }

      // Gunakan format inline mention agar 100% aman dari error MarkdownV2
      const mentions = targets.map((u) => {
        const name = escapeMDV2(u.user.first_name || 'Admin');
        return `[${name}](tg://user?id=${u.user.id})`;
      });

      const header = `📢 *${escapeMDV2('PENGUMUMAN')}*\n\n${escapeMDV2(text)}\n\n🔔 *${escapeMDV2('Tag')}:* `;
      const fullMentions = mentions.join(' ');
      let currentMsg = header + fullMentions;

      // Kirim langsung jika muat dalam 1 pesan
      if (currentMsg.length <= 4096) {
        return ctx.reply(currentMsg, { parse_mode: 'MarkdownV2' });
      }

      // Split otomatis jika pesan kepanjangan (> 4096 karakter)
      let part = 1;
      let tempMsg = header + `(${escapeMDV2(`Bagian ${part}`)})\n`;
      
      for (const mention of mentions) {
        if ((tempMsg + ' ' + mention).length > 4090) {
          await ctx.reply(tempMsg.trim(), { parse_mode: 'MarkdownV2' });
          part++;
          tempMsg = `🔔 *${escapeMDV2('Tag')} (${escapeMDV2(`Bagian ${part}`)}):* `;
        }
        tempMsg += ' ' + mention;
      }
      
      if (tempMsg.trim().length > 0) {
        await ctx.reply(tempMsg.trim(), { parse_mode: 'MarkdownV2' });
      }

    } catch (error) {
      console.error('Tagall Error:', error);
      await ctx.reply(`❌ _Terjadi kesalahan:_ ${escapeMDV2(error.message || 'Unknown error')}`, { parse_mode: 'MarkdownV2' });
    }
  });
};
