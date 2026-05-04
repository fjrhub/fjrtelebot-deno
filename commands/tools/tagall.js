// Helper: Escape semua karakter khusus MarkdownV2 Telegram
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
      return ctx.reply(
        '❌ _This command only works in groups or supergroups\\._',
        { parse_mode: 'MarkdownV2' }
      );
    }

    // 2️⃣ Ambil pesan
    const rawText = ctx.match?.trim();
    if (!rawText) {
      return ctx.reply(
        '⚠️ _Please provide a message after `/tagall`\\._\n\n_Example:_ `/tagall Meeting at 8 PM`',
        { parse_mode: 'MarkdownV2' }
      );
    }

    try {
      // 📌 Ambil Admins
      const admins = await ctx.api.getChatAdministrators(chatId);

      // Filter user valid
      const targets = admins.filter(
        (a) => !a.user.is_bot && a.user.id !== ctx.from?.id
      );

      if (targets.length === 0) {
        return ctx.reply(
          '⚠️ _No other members to tag\\._',
          { parse_mode: 'MarkdownV2' }
        );
      }

      // 3️⃣ Build mention list (AMAN)
      const mentionList = [];

      for (const u of targets) {
        if (u.user.username) {
          // 🔥 WAJIB escape username
          mentionList.push(`@${escapeMDV2(u.user.username)}`);
        } else {
          const name = escapeMDV2(u.user.first_name || 'Member');
          mentionList.push(`[${name}](tg://user?id=${u.user.id})`);
        }
      }

      // 4️⃣ Tag pengirim
      const senderName = ctx.from?.first_name || 'User';
      const senderTag = ctx.from?.username
        ? `@${escapeMDV2(ctx.from.username)}`
        : `[${escapeMDV2(senderName)}](tg://user?id=${ctx.from.id})`;

      // 5️⃣ Susun header
      const escapedMsg = escapeMDV2(rawText);
      const headerPart =
        `📢 *ANNOUNCEMENT*\n\n${escapedMsg}\n\n` +
        `📤 *Sent by:* ${senderTag}\n🔔 *Tags:*`;

      // 6️⃣ Split aman berdasarkan array
      const MAX_LEN = 4096;
      const messagesToSend = [];

      let currentPart = headerPart;

      for (const mention of mentionList) {
        if ((currentPart + ' ' + mention).length > MAX_LEN) {
          messagesToSend.push(currentPart.trim());

          currentPart = `🔔 *Tags \\(cont\\.\\):* ${mention}`;
        } else {
          currentPart += ' ' + mention;
        }
      }

      if (currentPart.trim()) {
        messagesToSend.push(currentPart.trim());
      }

      // 7️⃣ Kirim (anti flood)
      for (let i = 0; i < messagesToSend.length; i++) {
        await ctx.reply(messagesToSend[i], {
          parse_mode: 'MarkdownV2',
        });

        if (i < messagesToSend.length - 1) {
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    } catch (error) {
      console.error('❌ Tagall Error:', error);

      const safeError = escapeMDV2(error.message || 'Unknown error');
      return ctx.reply(
        `❌ _Failed to execute:_ ${safeError}`,
        { parse_mode: 'MarkdownV2' }
      );
    }
  });
};
