import { bot } from "../bot.js";
import { InputFile } from "npm:grammy";

// --- Constants ---
const API_BASE_URL = "https://api-faa.my.id/faa";
const MAX_MEDIA_GROUP_SIZE = 10;
const BATCH_DELAY_MS = 800;
const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://www.tiktok.com/",
  "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
};

// --- Main Handler ---
export async function handleApiRequest(req) {
  const secretHeader = req.headers.get("x-vercel-secret");
  const secretEnv = Deno.env.get("API_SECRET");
  
  if (secretHeader !== secretEnv) {
    return new Response("Unauthorized", { status: 401 });
  }

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

  // Fire-and-forget background process
  processInBackground(chatId, userId, url, excludedSlides || [], platform, mention)
    .catch(err => console.error("[Background Fatal Error]", err));

  return new Response("OK", { status: 200 });
}

// --- Background Processor ---
async function processInBackground(chatId, userId, url, excludedSlides, platform, mention) {
  try {
    console.log(`[Worker] Mulai: ${platform} | URL: ${url}`);
    await bot.api.sendChatAction(chatId, "upload_photo").catch(() => {});

    const endpoint = platform === "Instagram" ? "/igdl" 
                 : platform === "TikTok" ? "/tiktok" 
                 : null;

    if (!endpoint) {
      await bot.api.sendMessage(chatId, `⚠️ Platform <b>${platform}</b> belum disupport.`, { parse_mode: "HTML" });
      return;
    }

    const apiUrl = `${API_BASE_URL}${endpoint}?url=${encodeURIComponent(url)}`;
    const apiRes = await fetch(apiUrl, { headers: DEFAULT_HEADERS });
    
    if (!apiRes.ok) throw new Error(`API Downloader HTTP ${apiRes.status}`);
    
    const apiData = await apiRes.json();
    if (!apiData.status || !apiData.result) {
      throw new Error(`API Downloader gagal: ${apiData.message || "Response tidak valid"}`);
    }

    const result = apiData.result;
    const senderName = mention || "User";
    const caption = `📥 Sender: <a href="tg://user?id=${userId}">${senderName}</a>`;

    if (platform === "Instagram") {
      await handleInstagram(result, excludedSlides, caption, chatId);
    } else if (platform === "TikTok") {
      await handleTikTok(result, excludedSlides, caption, chatId);
    }

    console.log(`[Worker] ✅ Sukses mengirim ke ${chatId}`);
  } catch (err) {
    console.error(`[Worker Error] ChatId: ${chatId} | Error:`, err.message);
    await bot.api.sendMessage(chatId, `❌ Gagal memproses:\n<code>${err.message}</code>`, { parse_mode: "HTML" }).catch(() => {});
  }
}

// --- Platform Handlers ---
async function handleInstagram(result, excludedSlides, caption, chatId) {
  let mediaUrls = result.url;
  if (typeof mediaUrls === "string") mediaUrls = [mediaUrls];
  
  if (!Array.isArray(mediaUrls) || mediaUrls.length === 0) {
    throw new Error("Tidak ada media di hasil API Instagram.");
  }

  const metaIsVideo = result.metadata?.isVideo;
  const isVideo = metaIsVideo === true || metaIsVideo === "true" || mediaUrls[0].includes(".mp4");

  if (isVideo || mediaUrls.length === 1) {
    await sendSingleMedia(mediaUrls[0], isVideo, caption, chatId);
  } else {
    await sendMediaGroup(mediaUrls, excludedSlides, caption, chatId);
  }
}

async function handleTikTok(result, excludedSlides, caption, chatId) {
  const type = result.type;

  if (type === "video") {
    const videoUrl = result.alternatives?.selected || result.alternatives?.hd || (typeof result.data === "string" ? result.data : null);
    if (!videoUrl) throw new Error("URL video TikTok tidak ditemukan.");
    await sendSingleMedia(videoUrl, true, caption, chatId);
  } 
  else if (type === "image") {
    let imageUrls = [];
    if (Array.isArray(result.data)) imageUrls = result.data;
    else if (Array.isArray(result.alternatives)) imageUrls = result.alternatives;
    else if (typeof result.data === "string") imageUrls = [result.data];

    if (imageUrls.length === 0) throw new Error("Tidak ada gambar di hasil API TikTok.");
    await sendMediaGroup(imageUrls, excludedSlides, caption, chatId);
  } 
  else {
    throw new Error(`Tipe TikTok tidak dikenali: ${type}`);
  }
}

// --- Media Sending Helpers ---
async function sendSingleMedia(mediaUrl, isVideo, caption, chatId) {
  const res = await fetch(mediaUrl, { headers: DEFAULT_HEADERS });
  if (!res.ok) throw new Error(`Gagal download media: HTTP ${res.status}`);
  if (!res.body) throw new Error("Response body kosong.");

  const ext = isVideo ? ".mp4" : ".jpeg";
  const inputFile = new InputFile(res.body, `media_${Date.now()}${ext}`);

  if (isVideo) {
    await bot.api.sendVideo(chatId, inputFile, { caption, parse_mode: "HTML", supports_streaming: true });
  } else {
    await bot.api.sendPhoto(chatId, inputFile, { caption, parse_mode: "HTML" });
  }
}

async function sendMediaGroup(mediaUrls, excludedSlides, caption, chatId) {
  const excludeSet = new Set(
    Array.isArray(excludedSlides) 
      ? excludedSlides.filter(n => typeof n === 'number' && n > 0) 
      : []
  );
  
  const filteredUrls = mediaUrls.filter((_, index) => !excludeSet.has(index + 1));

  if (filteredUrls.length === 0) {
    await bot.api.sendMessage(chatId, "⚠️ Semua slide dikecualikan.", { parse_mode: "HTML" });
    return;
  }

  const chunkArray = (arr, size) => {
    const res = [];
    for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
    return res;
  };

  const groups = chunkArray(filteredUrls, MAX_MEDIA_GROUP_SIZE);

  for (let i = 0; i < groups.length; i++) {
    const chunk = groups[i];
    
    // Concurrent download for better performance (SSS+ expectation)
    const downloadPromises = chunk.map(async (mediaUrl, index) => {
      try {
        const res = await fetch(mediaUrl, { headers: DEFAULT_HEADERS });
        if (!res.ok || !res.body) {
          console.error(`[Download] Gagal HTTP ${res?.status} atau body kosong: ${mediaUrl}`);
          return null;
        }

        const contentType = res.headers.get("content-type") || "";
        const typeItem = contentType.includes("video") || mediaUrl.includes(".mp4") ? "video" : "photo";
        const ext = typeItem === "video" ? ".mp4" : ".jpeg";
        const isFirstItem = (i === 0 && index === 0);

        return {
          type: typeItem,
          media: new InputFile(res.body, `media_${Date.now()}_${index}${ext}`),
          ...(isFirstItem ? { caption, parse_mode: "HTML" } : {}),
        };
      } catch (err) {
        console.error(`[Download] Exception:`, err.message);
        return null;
      }
    });

    const mediaGroup = (await Promise.all(downloadPromises)).filter(item => item !== null);

    if (mediaGroup.length > 0) {
      try {
        await bot.api.sendMediaGroup(chatId, mediaGroup);
        console.log(`[Telegram] ✅ Berhasil kirim batch ${i + 1} sebagai grup.`);
      } catch (err) {
        console.error(`[Telegram] ❌ Gagal kirim sebagai grup:`, err.message);
        console.log(`[Telegram] 🔄 Fallback: Mencoba kirim satu per satu...`);
        
        for (const item of mediaGroup) {
          try {
            if (item.type === "photo") {
              await bot.api.sendPhoto(chatId, item.media, { caption: item.caption, parse_mode: "HTML" });
            } else {
              await bot.api.sendVideo(chatId, item.media, { caption: item.caption, parse_mode: "HTML", supports_streaming: true });
            }
          } catch (e) {
            console.error("[Telegram] Fallback per-item juga gagal:", e.message);
          }
        }
      }
    } else {
      console.warn(`[Worker] Batch ${i + 1} kosong setelah filter.`);
      if (i === 0) {
        await bot.api.sendMessage(chatId, "❌ Gagal mengunduh media. Link mungkin expired atau dibatasi.", { parse_mode: "HTML" });
      }
    }

    if (i < groups.length - 1) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }
}
