export default (bot) => {
  bot.command("start", async (ctx) => {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    if (!chatId) return;

    const args = ctx.message?.text?.replace(/^\/start\s*/, "").trim();
    
    if (!args) {
      await ctx.reply("Bot aktif 🚀\n\nGunakan: `/start <url_tiktok_atau_instagram>`", { parse_mode: "Markdown" });
      return;
    }

    // 1. Parsing sederhana
    let mediaUrl = args;
    let excludedSlides = [];
    const match = args.match(/^(.+?)\s*-\s*([\d,\s]+)$/);
    if (match) {
      mediaUrl = match[1].trim();
      excludedSlides = match[2].split(/[\s,]+/).map(Number).filter((n) => !isNaN(n) && n > 0);
    }

    // 2. Validasi Regex
    const isTikTok = /tiktok\.com\/[^\s]+/i.test(mediaUrl);
    const isInstagram = /instagram\.com\/(?:p|reel|reels|tv)\/[A-Za-z0-9_-]+/i.test(mediaUrl);
    
    if (!isTikTok && !isInstagram) {
      await ctx.reply("⚠️ Link tidak valid. Hanya support TikTok atau Instagram.");
      return;
    }

    const platform = isTikTok ? "TikTok" : "Instagram";
    const mention = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    const payload = { chatId, userId, url: mediaUrl, excludedSlides, platform, mention };

    // 3. TRUE Fire-and-Forget ke Deno
    if (process.env.DENO_ENDPOINT_URL && process.env.API_SECRET) {
      fetch(process.env.DENO_ENDPOINT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-secret": process.env.API_SECRET,
        },
        body: JSON.stringify(payload),
      }).catch((err) => console.error("[Vercel] Fetch error:", err.message));
    }

    // 4. Beri tahu user bahwa proses sudah dimulai di background
    await ctx.reply(`🔄 <b>Memproses ${platform}...</b>\n\n<i>Mohon tunggu beberapa saat.</i>`, {
      parse_mode: "HTML",
    });
  });
};