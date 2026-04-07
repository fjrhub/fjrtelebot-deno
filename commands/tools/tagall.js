// Helper: Escape semua karakter khusus MarkdownV2 Telegram
const escapeMDV2 = (text: string): string => {
  if (!text) return '';
  // Karakter yang wajib di-escape di MarkdownV2: _ * [ ] ( ) ~ ` > # + - = | { } . !
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
};

export default (bot: any) => {
  bot.command("tagall", async (ctx: any) => {
    const chatId = ctx.chat?.id;
    const chatType = ctx.chat?.type;

    // 1️⃣ Validasi grup/supergroup
    if (!chatId || !['group', 'supergroup'].includes(chatType)) {
      return ctx.reply('❌ _This command only works in groups or supergroups._', { parse_mode: 'MarkdownV2' });
    }

    // 2️⃣ Wajib ada teks kustom
    // ctx.match biasanya berisi sisa teks setelah command
    const rawText = ctx.match?.trim();
    
    if (!rawText) {
      // Perhatikan titik di akhir kalimat harus di-escape (\.) jika menggunakan MarkdownV2 manual
      // Namun, karena kita pakai string literal biasa, kita pastikan isinya aman atau escape manual titik terakhir
      const errorMsg = '⚠️ _Please provide a message after `/tagall`\\._\n\n_Example:_ `/tagall Meeting at 8 PM`';
      return ctx.reply(errorMsg, { parse_mode: 'MarkdownV2' });
    }

    try {
      // 📌 Ambil Admins (karena getChatMembers tidak tersedia untuk bot biasa tanpa intent khusus/privilege)
      // Catatan: Ini hanya men-tag Admin. Untuk tag ALL member, butuh database lokal yang menyimpan member list.
      const admins = await ctx.api.getChatAdministrators(chatId);
      
      // Filter: Bukan bot, dan bukan pengirim command
      const targets = admins.filter(
        (a: any) => !a.user.is_bot && a.user.id !== ctx.from?.id
      );

      if (targets.length === 0) {
        return ctx.reply('⚠️ _No other members to tag\\._', { parse_mode: 'MarkdownV2' });
      }

      // 3️⃣ Format tag: prioritas @username
      let mentions = '';
      for (const u of targets) {
        if (u.user.username) {
          // Username tidak perlu di-escape kecuali ada underscore/garis bawah, tapi @username umumnya aman
          // Untuk aman, kita biarkan plain text karena @username valid
          mentions += `@${u.user.username} `;
        } else {          // Jika tidak punya username, gunakan inline mention [Name](tg://user?id=ID)
          // Name WAJIB di-escape
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
      
      // Header pesan
      const headerPart = `📢 *ANNOUNCEMENT*\n\n${escapedMsg}\n\n📤 *Sent by:* ${senderTag}\n🔔 *Tags:* `;

      // 5️⃣ Split pesan jika terlalu panjang (>4096 char)
      const MAX_LEN = 4096;
      const mentionArray = mentions.trim().split(' ').filter(Boolean); // Hapus empty strings
      const messagesToSend: string[] = [];
      
      let currentPart = headerPart;

      for (const mention of mentionArray) {
        // Cek apakah penambahan mention berikutnya melebihi limit
        if ((currentPart + ' ' + mention).length > MAX_LEN) {
          // Simpan part saat ini
          messagesToSend.push(currentPart.trim());
          // Mulai part baru dengan header lanjutan
          currentPart = `🔔 *Tags \\(cont\\.\\):* ${mention}`;
        } else {
          currentPart += ' ' + mention;
        }
      }
      
      // Sisa bagian terakhir
      if (currentPart.trim().length > 0) {
        messagesToSend.push(currentPart.trim());
      }

      // 6️⃣ Kirim dengan delay anti-flood
      for (let i = 0; i < messagesToSend.length; i++) {
        await ctx.reply(messagesToSend[i], { parse_mode: 'MarkdownV2' });
        
        // Delay 1 detik antar pesan jika lebih dari 1 pesan
        if (i < messagesToSend.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));        }
      }
    } catch (error: any) {
      console.error('❌ Tagall Error:', error);
      
      // Pastikan error message juga ter-escape
      const safeError = escapeMDV2(error.message || 'Unknown error');
      ctx.reply(`❌ _Failed to execute: ${safeError}_`, { parse_mode: 'MarkdownV2' });
    }
  });
};
