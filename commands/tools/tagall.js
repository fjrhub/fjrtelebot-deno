// Helper: Escape semua karakter khusus MarkdownV2 Telegram
const escapeMDV2 = (text) => {
  if (!text) return '';
  // Karakter yang wajib di-escape di MarkdownV2: _ * [ ] ( ) ~ ` > # + - = | { } . !
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
    const rawText = ctx.match?.trim();
    
    if (!rawText) {
      // Escape titik secara manual di string literal
      const errorMsg = '⚠️ _Please provide a message after `/tagall`\\._\n\n_Example:_ `/tagall Meeting at 8 PM`';
      return ctx.reply(errorMsg, { parse_mode: 'MarkdownV2' });
    }

    try {
      // 📌 Ambil Admins
      const admins = await ctx.api.getChatAdministrators(chatId);
      
      // Filter: Bukan bot, dan bukan pengirim command
      const targets = admins.filter(
        (a) => !a.user.is_bot && a.user.id !== ctx.from?.id
      );

      if (targets.length === 0) {
        return ctx.reply('⚠️ _No other members to tag\\._', { parse_mode: 'MarkdownV2' });
      }

      // 3️⃣ Format tag
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
      const senderName = ctx.from?.first_name || 'User';
      const senderTag = ctx.from?.username
        ? `@${ctx.from.username}`
        : `[${escapeMDV2(senderName)}](tg://user?id=${ctx.from.id})`;

      // 4️⃣ Susun pesan
      const escapedMsg = escapeMDV2(rawText);
      const headerPart = `📢 *ANNOUNCEMENT*\n\n${escapedMsg}\n\n📤 *Sent by:* ${senderTag}\n🔔 *Tags:* `;

      // 5️⃣ Split pesan jika terlalu panjang (>4096 char)
      const MAX_LEN = 4096;
      const mentionArray = mentions.trim().split(' ').filter(Boolean);
      const messagesToSend = [];
      
      let currentPart = headerPart;

      for (const mention of mentionArray) {
        if ((currentPart + ' ' + mention).length > MAX_LEN) {
          messagesToSend.push(currentPart.trim());
          // Escape tanda kurung dan titik untuk continuation header
          currentPart = `🔔 *Tags \\(cont\\.\\):* ${mention}`;
        } else {
          currentPart += ' ' + mention;
        }
      }
      
      if (currentPart.trim().length > 0) {
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
      const safeError = escapeMDV2(error.message || 'Unknown error');
      ctx.reply(`❌ _Failed to execute: ${safeError}_`, { parse_mode: 'MarkdownV2' });
    }
  });
};
