import { bot } from "../bot.js";
import { InputFile } from "npm:grammy";

export async function handleApiRequest(req) {
  // 1. Validasi Secret Key
  const secretHeader = req.headers.get("x-vercel-secret");
  const secretEnv = Deno.env.get("API_SECRET");
  if (secretHeader !== secretEnv) return new Response("Unauthorized", { status: 401 });

  // 2. Parse Payload dari Vercel
  let payload;
  try { payload = await req.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }

  const { chatId, userId, url, excludedSlides, platform, mention } = payload;
  if (!chatId || !url) return new Response("Missing data", { status: 400 });

  // 3. LANGSUNG BALAS VERCEL (Fire-and-forget, biar Vercel gak timeout)
  prosesDiBackground(chatId, userId, url, excludedSlides || [], platform, mention);
  return new Response("OK", { status: 200 });
}

// 🔥 FUNGSI PEKERJAAN BERAT (Jalan di Background Deno) 🔥
async function prosesDiBackground(chatId, userId, url, excludedSlides, platform, mention) {
  try {
    await bot.api.sendChatAction(chatId, "upload_video").catch(() => {});

    const headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" };
    let apiUrl = "";

    // === PILIH API BERDASARKAN PLATFORM ===
    if (platform === "Instagram") {
      apiUrl = `https://api-faa.my.id/faa/igdl?url=${encodeURIComponent(url)}`;
    } else if (platform === "TikTok") {
      apiUrl = `https://api-faa.my.id/faa/tiktok?url=${encodeURIComponent(url)}`;
    } else if (platform === "Facebook") {
      // 🔧 TODO: Tambahkan API Facebook di sini nanti
      await bot.api.sendMessage(chatId, `⚠️ Platform <b>${platform}</b> belum disupport.`, { parse_mode: "HTML" });
      return;
    } else {
      await bot.api.sendMessage(chatId, `⚠️ Platform tidak dikenali.`, { parse_mode: "HTML" });
      return;
    }

    // 1. Fetch ke API Downloader
    const apiRes = await fetch(apiUrl, { headers });
    const apiData = await apiRes.json();

    if (!apiData.status || !apiData.result) {
      throw new Error("API Downloader gagal memproses URL.");
    }

    const result = apiData.result;

    // 2. Format Sender Tag (HTML yang bisa di-klik)
    const senderTag = `<a href="tg://user?id=${userId}">${mention}</a>`;
    const caption = `Sender: ${senderTag}`;

    // ============================================
    // 📸 INSTAGRAM HANDLER
    // ============================================
    if (platform === "Instagram") {
      const mediaUrls = result.url;
      if (!mediaUrls || mediaUrls.length === 0) throw new Error("Tidak ada media di hasil API.");

      const metaIsVideo = result.metadata?.isVideo;
      const isVideoFromApi = metaIsVideo === true || metaIsVideo === "true";

      if (isVideoFromApi || mediaUrls.length === 1) {
        // Kasus Video Reels / 1 Foto Tunggal
        await kirimMediaTunggal(mediaUrls[0], isVideoFromApi, caption, headers, chatId);
      } else {
        // Kasus Album Carousel (Banyak Gambar)
        await kirimMediaGroup(mediaUrls, excludedSlides, caption, headers, chatId);
      }
    }

    // ============================================
    // 🎵 TIKTOK HANDLER
    // ============================================
    else if (platform === "TikTok") {
      const type = result.type; // "video" atau "image"

      if (type === "video") {
        // === KASUS VIDEO TIKTOK ===
        // Prioritas: alternatives.selected (HD) > alternatives.hd > result.data
        const videoUrl = 
          result.alternatives?.selected || 
          result.alternatives?.hd || 
          (typeof result.data === "string" ? result.data : null);

        if (!videoUrl) throw new Error("URL video TikTok tidak ditemukan.");

        await kirimMediaTunggal(videoUrl, true, caption, headers, chatId);
      } 
      else if (type === "image") {
        // === KASUS IMAGE TIKTOK (PHOTO MODE / SLIDE) ===
        const imageUrls = Array.isArray(result.data) ? result.data : 
                         (Array.isArray(result.alternatives) ? result.alternatives : []);
        
        if (imageUrls.length === 0) throw new Error("Tidak ada gambar di hasil API TikTok.");

        await kirimMediaGroup(imageUrls, excludedSlides, caption, headers, chatId);
      } 
      else {
        throw new Error(`Tipe TikTok tidak dikenali: ${type}`);
      }
    }

  } catch (err) {
    console.error("[Worker Error]", err);
    await bot.api.sendMessage(chatId, `❌ Gagal memproses:\n<code>${err.message}</code>`, { parse_mode: "HTML" }).catch(() => {});
  }
}

// ==========================================
// 🛠️ HELPER FUNCTIONS (DRY - Don't Repeat Yourself)
// ==========================================

// Kirim 1 Video atau 1 Foto (Streaming via InputFile)
async function kirimMediaTunggal(mediaUrl, isVideo, caption, headers, chatId) {
  const res = await fetch(mediaUrl, { headers });
  if (!res.ok) throw new Error(`Gagal download media: HTTP ${res.status}`);

  const ext = isVideo ? ".mp4" : ".jpg";
  const inputFile = new InputFile(res.body, `media_${Date.now()}${ext}`);

  if (isVideo) {
    await bot.api.sendVideo(chatId, inputFile, {
      caption,
      parse_mode: "HTML",
      supports_streaming: true,
    });
  } else {
    await bot.api.sendPhoto(chatId, inputFile, {
      caption,
      parse_mode: "HTML",
    });
  }
}

// Kirim Album Carousel (dengan filter excludedSlides)
async function kirimMediaGroup(mediaUrls, excludedSlides, caption, headers, chatId) {
  let filteredUrls = mediaUrls;

  // Terapkan filter excludedSlides (misal user ketik: url -12)
  if (excludedSlides && excludedSlides.length > 0) {
    filteredUrls = mediaUrls.filter((_, index) => !excludedSlides.includes(index + 1));
  }

  if (filteredUrls.length === 0) {
    await bot.api.sendMessage(chatId, "⚠️ All selected slides were excluded. No media to send.", { parse_mode: "HTML" });
    return;
  }

  // Chunking per 10 item (batas Telegram)
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

      // Deteksi tipe media (biasanya TikTok image selalu jpg/jpeg, tapi kita cek saja)
      const typeItem = contentType.includes("video") ? "video" : "photo";
      const ext = typeItem === "video" ? ".mp4" : ".jpg";

      const inputFile = new InputFile(res.body, `media_${Date.now()}_${i}_${j}${ext}`);

      mediaGroup.push({
        type: typeItem,
        media: inputFile,
        // Caption hanya di item pertama dari batch pertama
        ...(i === 0 && j === 0 ? { caption, parse_mode: "HTML" } : {}),
      });
    }

    await bot.api.sendMediaGroup(chatId, mediaGroup);

    // Delay antar batch untuk hindari rate-limit Telegram
    if (i < groups.length - 1) await new Promise((r) => setTimeout(r, 500));
  }
}