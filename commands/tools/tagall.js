// Helper: Escape all Telegram MarkdownV2 special characters safely
const escapeMDV2 = (text) => {
  if (!text) return '';
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
};

export default (bot) => {
  bot.command('tagall', async (ctx) => {
    const chatId = ctx.chat?.id;
    const chatType = ctx.chat?.type;

    // 1️⃣ Validate group/supergroup
    if (!chatId || !['group', 'supergroup'].includes(chatType)) {
      return ctx.reply('❌ _This command only works in groups or supergroups\\._', { parse_mode: 'MarkdownV2' });
    }

    // 2️⃣ Validate message input
    const rawText = ctx.match?.trim();
    if (!rawText) {
      return ctx.reply('⚠️ _Please provide a message after `/tagall`\\._\n\n_Example:_ `/tagall Meeting at 8 PM`', { parse_mode: 'MarkdownV2' });
    }

    try {
      // 📌 Fetch targets (Currently set to admins to avoid API rate limits. 
      // To tag ALL members, replace with a paginated getChatMembers loop).
      const admins = await ctx.api.getChatAdministrators(chatId);
      const targets = admins.filter((a) => !a.user.is_bot && a.user.id !== ctx.from?.id);

      if (targets.length === 0) {
        return ctx.reply('⚠️ _No other members to tag\\._', { parse_mode: 'MarkdownV2' });
      }

      // 3️⃣ Build mention list safely
      const mentionList = targets.map((u) => {
        if (u.user.username) {
          return `@${escapeMDV2(u.user.username)}`;
        }
        const name = escapeMDV2(u.user.first_name || 'Member');
        return `[${name}](tg://user?id=${u.user.id})`;
      });

      // 4️⃣ Build sender tag
      const senderName = ctx.from?.first_name || 'User';
      const senderTag = ctx.from?.username
        ? `@${escapeMDV2(ctx.from.username)}`
        : `[${escapeMDV2(senderName)}](tg://user?id=${ctx.from.id})`;

      // 5️⃣ Compose header
      const escapedMsg = escapeMDV2(rawText);
      const header = `📢 *ANNOUNCEMENT*\n\n${escapedMsg}\n\n📤 *Sent by:* ${senderTag}\n🔔 *Tags:*`;

      // 6️⃣ Chunk messages safely (Telegram limit is 4096, using 4000 for safety margin)
      const MAX_LEN = 4000;
      const messagesToSend = [];
      let currentPart = header;

      for (const mention of mentionList) {
        const testPart = currentPart ? `${currentPart} ${mention}` : mention;
        
        if (testPart.length > MAX_LEN) {
          if (currentPart) messagesToSend.push(currentPart.trim());
          currentPart = `🔔 *Tags \\(cont\\.\\):* ${mention}`;
        } else {
          currentPart = testPart;
        }
      }
      
      if (currentPart?.trim()) {
        messagesToSend.push(currentPart.trim());
      }

      // 7️⃣ Send messages with anti-flood delay
      for (let i = 0; i < messagesToSend.length; i++) {
        await ctx.reply(messagesToSend[i], { parse_mode: 'MarkdownV2' });
        
        if (i < messagesToSend.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    } catch (error) {
      console.error('❌ Tagall Error:', error);
      const safeError = escapeMDV2(error.message || String(error));
      return ctx.reply(`❌ _Failed to execute:_ ${safeError}`, { parse_mode: 'MarkdownV2' });
    }
  });
};
