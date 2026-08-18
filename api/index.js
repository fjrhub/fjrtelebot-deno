import { bot } from "../bot.js";
import { InputFile } from "npm:grammy";

export async function handleApiRequest(req) {
  const secretHeader = req.headers.get("x-vercel-secret");
  const secretEnv = Deno.env.get("API_SECRET");
  if (secretHeader !== secretEnv) return new Response("Unauthorized", { status: 401 });

  let payload;
  try { payload = await req.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }

  const { chatId, userId, url, excludedSlides, platform, mention } = payload;
  if (!chatId || !url) return new Response("Missing data", { status: 400 });

  prosesDiBackground(chatId, userId, url, excludedSlides || [], platform, mention);
  return new Response("OK", { status: 200 });
}

async function prosesDiBackground(chatId, userId, url, excludedSlides, platform, mention) {
  try {
    await bot.api.sendChatAction(chatId, "upload_video").catch(() => {});

    let apiUrl = "";
    const headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };

    if (platform === "Instagram") {
      apiUrl = `https://api-faa.my.id/faa/igdl?url=${encodeURIComponent(url)}`;
    } else {
      await bot.api.sendMessage(chatId, `⚠️ Platform <b>${platform}</b> belum disupport.`, { parse_mode: "HTML" });
      return;
    }

    const apiRes = await fetch(apiUrl, { headers });
    const apiData = await apiRes.json();

    if (!apiData.status || !apiData.result?.url?.length) {
      throw new Error("API gagal memproses URL atau link tidak valid.");
    }

    const mediaUrls = apiData.result.url;
    
    // 🔥 PERBAIKAN UTAMA: Paksa baca isVideo dari API (handle boolean & string)
    const metaIsVideo = apiData.result.metadata?.isVideo;
    const isVideoFromApi = metaIsVideo === true || metaIsVideo === "true";

    const senderTag = `<a href="tg://user?id=${userId}">${mention}</a>`;
    const caption = `Sender: ${senderTag}`;

    if (isVideoFromApi || mediaUrls.length === 1) {
      // === KASUS TUNGGAL (Video Reels / 1 Foto) ===
      const mediaUrl = mediaUrls[0];
      const res = await fetch(mediaUrl, { headers });
      if (!res.ok) throw new Error("Gagal mengunduh media dari CDN.");

      const contentType = res.headers.get("content-type") || "";
      
      // Logika Penentuan Tipe yang Lebih Tegas
      let finalType = "photo"; // Default
      if (isVideoFromApi) {
        finalType = "video"; // Prioritas 1: API bilang video -> PAKSA VIDEO
      } else if (contentType.includes("video")) {
        finalType = "video"; // Prioritas 2: Header CDN bilang video
      } else if (contentType.includes("image")) {
        finalType = "photo";
      }

      const ext = finalType === "video" ? ".mp4" : ".jpg";
      const inputFile = new InputFile(res.body, `media_${Date.now()}${ext}`);

      if (finalType === "video") {
        await bot.api.sendVideo(chatId, inputFile, {
          caption, parse_mode: "HTML", supports_streaming: true,
        });
      } else {
        await bot.api.sendPhoto(chatId, inputFile, { caption, parse_mode: "HTML" });
      }

    } else {
      // === KASUS BANYAK (Carousel / Album Slide) ===
      let filteredUrls = mediaUrls;
      if (excludedSlides.length > 0) {
        filteredUrls = mediaUrls.filter((_, index) => !excludedSlides.includes(index + 1));
      }

      if (filteredUrls.length === 0) {
        await bot.api.sendMessage(chatId, "⚠️ All selected slides were excluded.", { parse_mode: "HTML" });
        return;
      }

      const chunkArray = (arr, size) => {
        const res = []; for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size)); return res;
      };

      const groups = chunkArray(filteredUrls, 10);

      for (let i = 0; i < groups.length; i++) {
        const mediaGroup = [];
        for (let j = 0; j < groups[i].length; j++) {
          const mediaUrl = groups[i][j];
          const res = await fetch(mediaUrl, { headers });
          const contentType = res.headers.get("content-type") || "";
          
          let typeItem = "photo";
          if (contentType.includes("video")) typeItem = "video";
          
          const ext = typeItem === "video" ? ".mp4" : ".jpg";
          const inputFile = new InputFile(res.body, `media_${Date.now()}_${i}_${j}${ext}`);

          mediaGroup.push({
            type: typeItem,
            media: inputFile,
            ...(i === 0 && j === 0 ? { caption, parse_mode: "HTML" } : {}),
          });
        }
        await bot.api.sendMediaGroup(chatId, mediaGroup);
        if (i < groups.length - 1) await new Promise((r) => setTimeout(r, 500));
      }
    }

  } catch (err) {
    console.error("[Worker Error]", err);
    await bot.api.sendMessage(chatId, `❌ Error: <code>${err.message}</code>`, { parse_mode: "HTML" }).catch(() => {});
  }
}