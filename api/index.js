import { bot } from "../bot.js";
import { InputFile } from "npm:grammy";

export async function handleApiRequest(req) {
  // 1. Validasi Secret Key
  const secretHeader = req.headers.get("x-vercel-secret");
  const secretEnv = Deno.env.get("API_SECRET");
  
  if (secretHeader !== secretEnv) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Parse Payload
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

  // 3. Fire-and-forget: Balik respon ke Vercel segera, proses berat jalan di background
  // Catatan: Jika menggunakan Deno Deploy, pastikan environment mendukung background tasks 
  // atau gunakan pola yang menjaga event loop tetap hidup.
  prosesDiBackground(chatId, userId, url, excludedSlides || [], platform, mention)
    .catch(err => console.error("[Background Fatal Error]", err));

  return new Response("OK", { status: 200 });
}

// 🔥 FUNGSI PEKERJAAN BERAT 🔥
async function prosesDiBackground(chatId, userId, url, excludedSlides, platform, mention) {
  try {
    console.log(`[Worker] Mulai memproses: ${platform} | URL: ${url}`);
    
    // Kirim chat action (abaikan error jika chat sudah ditutup/user block bot)
    await bot.api.sendChatAction(chatId, "upload_video").catch(() => {});

    const headers = { 
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
    };
    
    let apiUrl = "";
    if (platform === "Instagram") {
      apiUrl = `https://api-faa.my.id/faa/igdl?url=${encodeURIComponent(url)}`;
    } else if (platform === "TikTok") {
      apiUrl = `https://api-faa.my.id/faa/tiktok?url=${encodeURIComponent(url)}`;
    } else {
      await bot.api.sendMessage(chatId, `⚠️ Platform <b>${platform}</b> belum disupport.`, { parse_mode: "HTML" });
      return;
    }

    // 1. Fetch ke API Downloader
    const apiRes = await fetch(apiUrl, { headers });
    if (!apiRes.ok) throw new Error(`API Downloader HTTP ${apiRes.status}`);
    
    const apiData = await apiRes.json();
    if (!apiData.status || !apiData.result) {
      throw new Error(`API Downloader gagal: ${apiData.message || "Response tidak valid"}`);
    }

    const result = apiData.result;
    const senderName = mention || ctx?.from?.first_name || "User";
    const caption = `📥 Sender: <a href="tg://user?id=${userId}">${senderName}</a>`;

    // ============================================
    // 📸 INSTAGRAM HANDLER
    // ============================================
    if (platform === "Instagram") {
      let mediaUrls = result.url;
      if (typeof mediaUrls === "string") mediaUrls = [mediaUrls];
      
      if (!Array.isArray(mediaUrls) || mediaUrls.length === 0) {
        throw new Error("Tidak ada media di hasil API Instagram.");
      }

      const metaIsVideo = result.metadata?.isVideo;
      const isVideo = metaIsVideo === true || metaIsVideo === "true" || mediaUrls[0].includes(".mp4");

      if (isVideo || mediaUrls.length === 1) {
        await kirimMediaTunggal(mediaUrls[0], isVideo, caption, headers, chatId);
      } else {
        await kirimMediaGroup(mediaUrls, excludedSlides, caption, headers, chatId);
      }
    }

    // ============================================
    // 🎵 TIKTOK HANDLER
    // ============================================
    else if (platform === "TikTok") {
      const type = result.type; // "video" atau "image"

      if (type === "video") {
        const videoUrl = 
          result.alternatives?.selected || 
          result.alternatives?.hd || 
          (typeof result.data === "string" ? result.data : null);

        if (!videoUrl) throw new Error("URL video TikTok tidak ditemukan di response API.");
        await kirimMediaTunggal(videoUrl, true, caption, headers, chatId);
      } 
      else if (type === "image") {
        let imageUrls = [];
        if (Array.isArray(result.data)) {
          imageUrls = result.data;
        } else if (Array.isArray(result.alternatives)) {
          imageUrls = result.alternatives;
        } else if (typeof result.data === "string") {
          imageUrls = [result.data];
        }

        if (imageUrls.length === 0) throw new Error("Tidak ada gambar di hasil API TikTok.");
        await kirimMediaGroup(imageUrls, excludedSlides, caption, headers, chatId);
      } 
      else {
        throw new Error(`Tipe TikTok tidak dikenali: ${type}`);
      }
    }

    console.log(`[Worker] ✅ Sukses mengirim ke ${chatId}`);

  } catch (err) {
    console.error(`[Worker Error] ChatId: ${chatId} | Error:`, err.message);
    await bot.api.sendMessage(chatId, `❌ Gagal memproses:\n<code>${err.message}</code>\n\n<i>Coba lagi atau gunakan link lain.</i>`, { 
      parse_mode: "HTML" 
    }).catch(() => {});
  }
}

// ==========================================
// 🛠️ HELPER FUNCTIONS
// ==========================================

async function kirimMediaTunggal(mediaUrl, isVideo, caption, headers, chatId) {
  const res = await fetch(mediaUrl, { headers });
  if (!res.ok) throw new Error(`Gagal download media: HTTP ${res.status}`);
  if (!res.body) throw new Error("Response body kosong saat download media.");

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

async function kirimMediaGroup(mediaUrls, excludedSlides, caption, headers, chatId) {
  // Normalisasi excludedSlides menjadi array angka
  const excludeSet = new Set(
    Array.isArray(excludedSlides) 
      ? excludedSlides.filter(n => typeof n === 'number' && n > 0) 
      : []
  );

  const filteredUrls = mediaUrls.filter((_, index) => !excludeSet.has(index + 1));

  if (filteredUrls.length === 0) {
    await bot.api.sendMessage(chatId, "⚠️ Semua slide yang dipilih dikecualikan. Tidak ada media untuk dikirim.", { parse_mode: "HTML" });
    return;
  }

  // Chunking per 10 item (batas maksimal Telegram Media Group)
  const chunkArray = (arr, size) => {
    const res = [];
    for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
    return res;
  };

  const groups = chunkArray(filteredUrls, 10);

  for (let i = 0; i < groups.length; i++) {
    // 🚀 OPTIMASI: Fetch semua media dalam chunk secara PARALEL
    const fetchPromises = groups[i].map(async (mediaUrl, j) => {
      try {
        const res = await fetch(mediaUrl, { headers });
        if (!res.ok) {
          console.warn(`[Download] Gagal mengambil ${mediaUrl} (HTTP ${res.status}), skipping...`);
          return null;
        }

        const contentType = res.headers.get("content-type") || "";
        const typeItem = contentType.includes("video") ? "video" : "photo";
        const ext = typeItem === "video" ? ".mp4" : ".jpg";

        return {
          type: typeItem,
          media: new InputFile(res.body, `media_${Date.now()}_${i}_${j}${ext}`),
          ...(i === 0 && j === 0 ? { caption, parse_mode: "HTML" } : {}),
        };
      } catch (err) {
        console.warn(`[Download] Error saat fetch ${mediaUrl}:`, err.message);
        return null;
      }
    });

    // Tunggu semua download dalam chunk selesai, lalu filter yang null (gagal)
    const mediaGroup = (await Promise.all(fetchPromises)).filter(item => item !== null);

    if (mediaGroup.length > 0) {
      await bot.api.sendMediaGroup(chatId, mediaGroup);
    } else {
      console.warn(`[Worker] Chunk ${i + 1} kosong setelah filter, tidak dikirim.`);
    }

    // Delay antar batch untuk menghindari rate-limit Telegram (429 Too Many Requests)
    if (i < groups.length - 1) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }
}
