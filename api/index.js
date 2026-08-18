import { bot } from "../bot.js";
import { InputFile } from "npm:grammy";

export async function handleApiRequest(req) {
  // 1. Validasi Secret Key
  const secretHeader = req.headers.get("x-vercel-secret");
  const secretEnv = Deno.env.get("API_SECRET");
  if (secretHeader !== secretEnv) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Parse Payload dari Vercel
  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { chatId, userId, url, excludedSlides, platform, mention } = payload;
  if (!chatId || !url) {
    return new Response("Missing data", { status: 400 });
  }

  // 3. LANGSUNG BALAS VERCEL (Biar Vercel gak Timeout & Gak Terputus)
  prosesDiBackground(chatId, userId, url, excludedSlides || [], platform, mention);

  return new Response("OK", { status: 200 });
}

// 🔥 FUNGSI PEKERJAAN BERAT (Jalan di Background Deno) 🔥
async function prosesDiBackground(chatId, userId, url, excludedSlides, platform, mention) {
  try {
    // Kasih aksi "typing/uploading" di chat user biar gak dikira nge-lag
    await bot.api.sendChatAction(chatId, "upload_photo").catch(() => {});

    let apiUrl = "";
    let headers = { 
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36" 
    };

    // === PILIH API BERDASARKAN PLATFORM ===
    if (platform === "Instagram") {
      apiUrl = `https://api-faa.my.id/faa/igdl?url=${encodeURIComponent(url)}`;
    } 
    // NANTI TAMBAHKAN TIKTOK & FACEBOOK DI SINI
    // else if (platform === "TikTok") { apiUrl = `...`; }
    // else if (platform === "Facebook") { apiUrl = `...`; }
    else {
      await bot.api.sendMessage(chatId, `⚠️ Platform <b>${platform}</b> belum diimplementasikan di Worker.`, { parse_mode: "HTML" });
      return;
    }

    // 1. Fetch ke API Downloader
    const apiRes = await fetch(apiUrl, { headers });
    const apiData = await apiRes.json();

    if (!apiData.status || !apiData.result || !apiData.result.url || apiData.result.url.length === 0) {
      throw new Error("API Downloader gagal memproses URL atau link tidak valid.");
    }

    const mediaUrls = apiData.result.url;
    const isVideo = apiData.result.metadata?.isVideo || false;

    // 2. Format Sender Tag (HTML)
    const displayName = mention.startsWith('@') ? mention : mention;
    const senderTag = `<a href="tg://user?id=${userId}">${displayName}</a>`;
    const caption = `Sender: ${senderTag}`;

    // 3. Eksekusi Pengiriman Media
    if (isVideo || mediaUrls.length === 1) {
      // === KASUS 1: VIDEO TUNGGAL ATAU GAMBAR TUNGGAL ===
      const mediaUrl = mediaUrls[0];
      const res = await fetch(mediaUrl, { headers });
      if (!res.ok) throw new Error("Gagal mengunduh media mentah dari CDN.");

      const contentType = res.headers.get("content-type") || "";
      let ext = ".bin";
      let isActuallyVideo = isVideo || contentType.includes("video/");
      
      if (isActuallyVideo) ext = ".mp4";
      else if (contentType.includes("image/")) ext = ".jpg";

      // STREAMING LANGSUNG! (Tidak membebani RAM Deno)
      const inputFile = new InputFile(res.body, `media_${Date.now()}${ext}`);

      if (isActuallyVideo) {
        await bot.api.sendVideo(chatId, inputFile, {
          caption: caption,
          parse_mode: "HTML",
          supports_streaming: true,
        });
      } else {
        await bot.api.sendPhoto(chatId, inputFile, {
          caption: caption,
          parse_mode: "HTML",
        });
      }

    } else {
      // === KASUS 2: BANYAK GAMBAR (CAROUSEL / ALBUM) ===
      let filteredUrls = mediaUrls;
      
      // Terapkan logika excludedSlides (misal user ketik: url -12)
      if (excludedSlides && excludedSlides.length > 0) {
        filteredUrls = mediaUrls.filter((_, index) => !excludedSlides.includes(index + 1));
      }

      if (filteredUrls.length === 0) {
        await bot.api.sendMessage(chatId, "⚠️ All selected slides were excluded. No photos to send.", { parse_mode: "HTML" });
        return;
      }

      // Telegram maksimal 10 media per group, jadi kita chunking
      const chunkArray = (arr, size) => {
        const res = [];
        for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
        return res;
      };

      const groups = chunkArray(filteredUrls, 10);

      for (let i = 0; i < groups.length; i++) {
        const mediaGroup = [];
        
        for (let j = 0; j < groups[i].length; j++) {
          const mediaUrl = groups[i][j];
          const res = await fetch(mediaUrl, { headers });
          
          const contentType = res.headers.get("content-type") || "";
          let ext = contentType.includes("video") ? ".mp4" : ".jpg";
          const type = contentType.includes("video") ? "video" : "photo";
          
          // Streaming per item
          const inputFile = new InputFile(res.body, `media_${Date.now()}_${i}_${j}${ext}`);

          mediaGroup.push({
            type: type,
            media: inputFile,
            // Caption hanya di foto/video pertama pada batch pertama
            ...(i === 0 && j === 0 ? { caption: caption, parse_mode: "HTML" } : {}),
          });
        }
        
        await bot.api.sendMediaGroup(chatId, mediaGroup);
        
        // Delay dikit antar batch biar gak kena rate-limit Telegram
        if (i < groups.length - 1) await new Promise((r) => setTimeout(r, 500));
      }
    }

  } catch (err) {
    console.error("[Background Task Error]", err);
    await bot.api.sendMessage(chatId, `❌ Gagal memproses URL:\n<code>${err.message}</code>`, { parse_mode: "HTML" }).catch(() => {});
  }
}