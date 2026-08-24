import { InputFile } from "npm:grammy";

export default (bot) => {
  bot.command("start", async (ctx) => {
    console.log("==========================================");
    console.log("[1/7] Command /start triggered");
    
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    if (!chatId) return;

    const args = ctx.message?.text?.replace(/^\/start\s*/, "").trim();
    
    if (!args) {
      await ctx.reply("Bot aktif 🚀\n\nGunakan: `/start <url_tiktok_atau_instagram>`", { parse_mode: "Markdown" });
      return;
    }

    console.log(`[2/7] Args received: ${args}`);

    // 1. Parsing URL & Exclusion
    let mediaUrl = args;
    let excludedSlides = [];
    const match = args.match(/^(.+?)\s*-\s*([\d,\s]+)$/);
    if (match) {
      mediaUrl = match[1].trim();
      excludedSlides = match[2].split(/[\s,]+/).map(Number).filter((n) => !isNaN(n) && n > 0);
    }
    console.log(`[3/7] Parsed URL: ${mediaUrl} | Excluded slides:`, excludedSlides);

    // 2. Validasi Regex
    const isTikTok = /tiktok\.com\/[^\s]+/i.test(mediaUrl);
    const isInstagram = /instagram\.com\/(?:p|reel|reels|tv)\/[A-Za-z0-9_-]+/i.test(mediaUrl);
    
    if (!isTikTok && !isInstagram) {
      console.log("[ERROR] Invalid URL format");
      await ctx.reply("⚠️ Link tidak valid. Hanya support TikTok atau Instagram.");
      return;
    }

    const platform = isTikTok ? "TikTok" : "Instagram";
    console.log(`[4/7] Platform detected: ${platform}`);

    // Beri tahu user & kirim chat action
    await ctx.reply(`🔄 <b>Memproses ${platform}...</b>\n\n<i>Mohon tunggu, sedang mendownload...</i>`, { parse_mode: "HTML" });
    await bot.api.sendChatAction(chatId, "upload_photo").catch(() => {});

    try {
      // 3. Fetch ke API Downloader
      const apiUrl = platform === "TikTok" 
        ? `https://api-faa.my.id/faa/tiktok?url=${encodeURIComponent(mediaUrl)}`
        : `https://api-faa.my.id/faa/igdl?url=${encodeURIComponent(mediaUrl)}`;

      console.log(`[5/7] Fetching Downloader API: ${apiUrl}`);
      const headers = { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.tiktok.com/", // Penting untuk bypass TikTok CDN block
        "Accept": "image/avif,image/webp,image/*,*/*;q=0.8"
      };

      const apiRes = await fetch(apiUrl, { headers });
      console.log(`[API] Downloader HTTP Status: ${apiRes.status}`);
      
      const apiData = await apiRes.json();
      // console.log("[API] Full Response:", JSON.stringify(apiData, null, 2)); // Uncomment jika ingin lihat full JSON di log

      if (!apiData.status || !apiData.result) {
        throw new Error(`API Downloader gagal: ${apiData.message || "Response tidak valid"}`);
      }

      const result = apiData.result;
      const mention = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
      const caption = `📥 Sender: <a href="tg://user?id=${userId}">${mention}</a>`;

      // 4. Proses TikTok Image Mode (Sesuai JSON yang kamu berikan)
      if (platform === "TikTok" && result.type === "image") {
        let imageUrls = Array.isArray(result.data) ? result.data : 
                        (Array.isArray(result.alternatives) ? result.alternatives : [result.data].filter(Boolean));
        
        // Terapkan filter excludedSlides
        if (excludedSlides.length > 0) {
          imageUrls = imageUrls.filter((_, index) => !excludedSlides.includes(index + 1));
        }

        console.log(`[6/7] Found ${imageUrls.length} images to process.`);

        if (imageUrls.length === 0) {
          throw new Error("Tidak ada gambar yang tersisa setelah filter.");
        }

        // Kirim satu per satu agar stabil dan terlog dengan baik
        for (let i = 0; i < Math.min(imageUrls.length, 10); i++) {
          console.log(`[MEDIA] Downloading image ${i + 1}/${imageUrls.length}...`);
          
          const mediaRes = await fetch(imageUrls[i], { headers });
          console.log(`[MEDIA] Media HTTP Status: ${mediaRes.status} ${mediaRes.statusText}`);
          
          if (!mediaRes.ok) {
            console.error(`[MEDIA] Failed to fetch media, skipping...`);
            continue; 
          }

          console.log(`[MEDIA] Converting to ArrayBuffer (mencegah stream putus)...`);
          const buffer = await mediaRes.arrayBuffer();
          console.log(`[MEDIA] Buffer size: ${(buffer.byteLength / 1024).toFixed(2)} KB`);

          const inputFile = new InputFile(new Uint8Array(buffer), `tiktok_img_${Date.now()}_${i}.jpeg`);
          
          console.log(`[TELEGRAM] Sending photo ${i + 1} to chat ${chatId}...`);
          const isCaption = (i === 0); // Caption hanya di gambar pertama
          await bot.api.sendPhoto(chatId, inputFile, { 
            caption: isCaption ? caption : "", 
            parse_mode: "HTML" 
          });
          console.log(`[TELEGRAM] ✅ Photo ${i + 1} sent successfully.`);
        }
        
        await ctx.reply("✅ <b>Selesai!</b>", { parse_mode: "HTML" });
      } 
      // 5. Fallback untuk TikTok Video atau Instagram (Single Media)
      else {
        console.log(`[6/7] Processing as single media (Video/IG)...`);
        let singleUrl = "";
        let isVideo = false;
        
        if (platform === "TikTok" && result.type === "video") {
          singleUrl = result.alternatives?.selected || result.alternatives?.hd || (typeof result.data === "string" ? result.data : null);
          isVideo = true;
        } else if (platform === "Instagram") {
          singleUrl = Array.isArray(result.url) ? result.url[0] : result.url;
          isVideo = result.metadata?.isVideo === true || result.metadata?.isVideo === "true" || (typeof singleUrl === "string" && singleUrl.includes(".mp4"));
        }

        if (!singleUrl) throw new Error("URL media tidak ditemukan di response API.");

        console.log(`[MEDIA] Downloading single media...`);
        const mediaRes = await fetch(singleUrl, { headers });
        if (!mediaRes.ok) throw new Error(`Gagal download media: HTTP ${mediaRes.status}`);

        console.log(`[MEDIA] Converting to ArrayBuffer...`);
        const buffer = await mediaRes.arrayBuffer();
        const ext = isVideo ? ".mp4" : ".jpeg";
        const inputFile = new InputFile(new Uint8Array(buffer), `media_${Date.now()}${ext}`);

        console.log(`[TELEGRAM] Sending ${isVideo ? "video" : "photo"}...`);
        if (isVideo) {
          await bot.api.sendVideo(chatId, inputFile, { caption, parse_mode: "HTML", supports_streaming: true });
        } else {
          await bot.api.sendPhoto(chatId, inputFile, { caption, parse_mode: "HTML" });
        }
        console.log(`[TELEGRAM] ✅ Media sent successfully.`);
        await ctx.reply("✅ <b>Selesai!</b>", { parse_mode: "HTML" });
      }

      console.log("[7/7] 🎉 PROCESS COMPLETED SUCCESSFULLY");
      console.log("==========================================");

    } catch (err) {
      console.error("[ERROR] ❌ FATAL ERROR:", err.message);
      console.error("[ERROR] Stack:", err.stack);
      await ctx.reply(`❌ <b>Gagal memproses:</b>\n<code>${err.message}</code>`, { parse_mode: "HTML" });
    }
  });
};