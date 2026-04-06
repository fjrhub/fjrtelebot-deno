// Escape karakter khusus MarkdownV2 agar tidak error parse
const escapeMDV2 = (text) => {
  if (!text) return '';
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
};

export default (bot) => {
  bot.command("tagall", async (ctx) => {
    const chatId = ctx.chat?.id;
    const chatType = ctx.chat?.type;

    // 1️⃣ Validasi grup/supergroup
    if (!chatId || !['group', 'supergroup'].includes(chatType)) {
      return ctx.reply('❌ _This command only works in groups or supergroups._', { parse_mode: 'MarkdownV2' });
    }

    // 2️⃣ Wajib ada teks kustom
    const customText = ctx.match?.trim();
    if (!customText) {
      return ctx.reply(
        '⚠️ _Please provide a message after `/tagall`._\n\n' +
        '_Example:_ `/tagall Meeting at 8 PM`',
        { parse_mode: 'MarkdownV2' }
      );
    }

    try {
      // 📌 API Limit: Telegram hanya menyediakan endpoint admin.
      // Untuk tag SEMUA member, simpan ID via event `message`/`new_chat_members` di DB.
      const admins = await ctx.api.getChatAdministrators(chatId);
      const targets = admins.filter(
        (a) => !a.user.is_bot && a.user.id !== ctx.from?.id
      );

      if (targets.length === 0) {
        return ctx.reply('⚠️ _No other members to tag._', { parse_mode: 'MarkdownV2' });
      }

      // 3️⃣ Format tag: prioritas @username
      let mentions = '';
      for (const u of targets) {
        if (u.user.username) {
          mentions += `@${u.user.username} `;
        } else {
          const name = escapeMDV2(u.user.first_name || 'Member');
          mentions += `[${name}](tg://user?id=${u.user.id}) `;
        }
      }

      // Tag pengirim
      const senderTag = ctx.from?.username
        ? `@${ctx.from.username}`
        : `[${escapeMDV2(ctx.from?.first_name || 'User')}](tg://user?id=${ctx.from.id})`;

      // 4️⃣ Susun pesan (layout rapi & terpisah)
      const escapedMsg = escapeMDV2(customText);
      const headerPart = `📢 *ANNOUNCEMENT*\n\n${escapedMsg}\n\n📤 *Sent by:* ${senderTag}\n🔔 *Tags:* `;

      // 5️⃣ Split aman untuk MarkdownV2 (hanya pecah bagian tags jika >4096)
      const MAX_LEN = 4096;
      const mentionArray = mentions.trim().split(' ');
      const messagesToSend = [];
      let currentPart = headerPart;

      for (const mention of mentionArray) {
        if ((currentPart + ' ' + mention).length > MAX_LEN) {
          messagesToSend.push(currentPart.trim());
          currentPart = `🔔 *Tags (cont.):* ${mention}`;
        } else {
          currentPart += ' ' + mention;
        }
      }
      if (currentPart.trim().length > headerPart.length) {
        messagesToSend.push(currentPart.trim());
      }

      // 6️⃣ Kirim dengan delay anti-flood
      for (let i = 0; i < messagesToSend.length; i++) {
        await ctx.reply(messagesToSend[i], { parse_mode: 'MarkdownV2' });
        if (i < messagesToSend.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error('❌ Tagall Error:', error);
      ctx.reply('❌ _Failed to execute. Make sure I am an admin with message permissions._', { parse_mode: 'MarkdownV2' });
    }
  });
};