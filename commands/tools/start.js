export default (bot) => {
  bot.command("start", async (ctx) => {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    if (!chatId) return;

    // Ambil argumen setelah /start
    const args = ctx.message?.text?.replace(/^\/start\s*/, "").trim();
    
    // Jika tidak ada argumen, tampilkan pesan default
    if (!args) {
      await ctx.reply("Bot aktif 🚀\n\nKirim link Instagram/TikTok/Facebook untuk download.");
      return;
    }

    // 1. Parsing URL & Slide Exclusion
    let mediaUrl = args;
    let excludedSlides = [];
    
    const match = args.match(/^(.+?)\s*-\s*([\d,\s]+)$/);
    if (match) {
      mediaUrl = match[1].trim();
      excludedSlides = match[2]
        .split(/[\s,]+/)
        .map(Number)
        .filter((n) => !isNaN(n) && n > 0);
    }

    // 2. Cek Regex Sosmed
    const tiktokRegex = /(?:https?:\/\/)?(?:www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+/i;
    const instagramRegex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|reels|tv)\/[A-Za-z0-9_-]+/i;
    const facebookRegex = /(?:https?:\/\/)?(?:www\.|web\.|m\.)?facebook\.com\/[^\s]+/i;

    const isTikTok = tiktokRegex.test(mediaUrl);
    const isInstagram = instagramRegex.test(mediaUrl);
    const isFacebook = facebookRegex.test(mediaUrl);

    if (!isTikTok && !isInstagram && !isFacebook) {
      await ctx.reply("⚠️ Link tidak dikenali. Kirim link Instagram/TikTok/Facebook yang valid.");
      return;
    }

    // 3. Siapkan Payload
    const platform = isTikTok ? "TikTok" : isInstagram ? "Instagram" : "Facebook";
    const mention = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    const payload = { chatId, userId, url: mediaUrl, excludedSlides, platform, mention };

    // 4. TRUE FIRE-AND-FORGET ke Deno
    if (process.env.DENO_ENDPOINT_URL && process.env.API_SECRET) {
      fetch(process.env.DENO_ENDPOINT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-secret": process.env.API_SECRET,
        },
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.error("[Vercel] Gagal menembak payload ke Deno:", err.message);
      });
    }

    // 5. Reply ke user bahwa proses dimulai
    await ctx.reply(`🔄 Memproses ${platform}...\n\n<i>Link: ${mediaUrl}</i>`, {
      parse_mode: "HTML",
    });
  });
};
