/**
 * Escapes special characters for Telegram MarkdownV2 parse mode.
 * @param {string} text - The text to escape.
 * @returns {string} - The escaped text.
 */
const escapeMDV2 = (text) => {
  if (!text) return '';
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
};

export default (bot) => {
  bot.command('tagall', async (ctx) => {
    const chatId = ctx.chat?.id;
    const chatType = ctx.chat?.type;

    // 1. Validate chat type
    if (!chatId || !['group', 'supergroup'].includes(chatType)) {
      return ctx.reply(
        '❌ _This command only works in groups or supergroups\\._',
        { parse_mode: 'MarkdownV2' }
      );
    }

    // 2. Validate input message
    const rawText = ctx.match?.trim();
    if (!rawText) {
      return ctx.reply(
        '⚠️ _Please provide a message after_ `/tagall` _\\._\n\n_Example:_ `/tagall Meeting at 8 PM`',
        { parse_mode: 'MarkdownV2' }
      );
    }

    // 3. Validate sender
    if (!ctx.from) {
      return ctx.reply('❌ _Could not identify the sender\\._', {
        parse_mode: 'MarkdownV2',
      });
    }

    try {
      // 4. Fetch chat administrators
      // Note: Telegram API does not provide a method to fetch all members.
      // This currently only tags administrators. To tag all members,
      // you need to maintain a local database of chat members.
      const admins = await ctx.api.getChatAdministrators(chatId);

      // Filter out bots and the sender
      const targets = admins.filter(
        (a) => !a.user.is_bot && a.user.id !== ctx.from.id
      );

      if (targets.length === 0) {
        return ctx.reply(
          '⚠️ _No other members to tag\\._',
          { parse_mode: 'MarkdownV2' }
        );
      }

      // 5. Build mention list
      const mentionList = targets.map((u) => {
        if (u.user.username) {
          return `@${escapeMDV2(u.user.username)}`;
        }
        const name = escapeMDV2(u.user.first_name || 'Member');
        return `[${name}](tg://user?id=${u.user.id})`;
      });

      // 6. Format sender tag
      const senderName = ctx.from.first_name || 'User';
      const senderTag = ctx.from.username
        ? `@${escapeMDV2(ctx.from.username)}`
        : `[${escapeMDV2(senderName)}](tg://user?id=${ctx.from.id})`;

      // 7. Construct message header
      const escapedMsg = escapeMDV2(rawText);
      const header =
        `📢 *${escapeMDV2('ANNOUNCEMENT')}*\n\n` +
        `${escapedMsg}\n\n` +
        `📤 *${escapeMDV2('Sent by')}:* ${senderTag}\n` +
        `🔔 *${escapeMDV2('Tags')}:*`;

      // 8. Split messages to respect Telegram's 4096 character limit
      const MAX_LEN = 4096;
      const messagesToSend = [];
      let currentPart = header;

      for (const mention of mentionList) {
        const nextPart = `${currentPart} ${mention}`;
        
        if (nextPart.length > MAX_LEN) {
          messagesToSend.push(currentPart.trim());
          currentPart = `🔔 *${escapeMDV2('Tags (cont.)')}:* ${mention}`;
        } else {
          currentPart = nextPart;
        }
      }

      if (currentPart.trim()) {
        messagesToSend.push(currentPart.trim());
      }

      // 9. Send messages with a delay to prevent rate limits
      for (let i = 0; i < messagesToSend.length; i++) {
        await ctx.reply(messagesToSend[i], { parse_mode: 'MarkdownV2' });

        if (i < messagesToSend.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 800));
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
