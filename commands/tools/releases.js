/**
 * Module untuk mengecek update yt-dlp dari GitHub
 * @module ytdlp-update-checker
 */

// Konfigurasi - sebaiknya dipindahkan ke environment variable atau config file
const CONFIG = {
  CURRENT_YTDLP_VERSION: process.env.YTDLP_VERSION || "2024.07.01",
  GITHUB_API_URL: "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest",
  USER_AGENT: "Telegraf-YTDLP-Checker/1.0",
  CACHE_TTL: 3600000, // 1 jam dalam milidetik
};

// Cache untuk menghindari rate limit GitHub API
let versionCache = {
  data: null,
  timestamp: 0,
};

/**
 * Fungsi helper untuk membandingkan versi
 * Mendukung format YYYY.MM.DD (yt-dlp) dan SemVer (X.Y.Z)
 * 
 * @param {string} latestVer - Versi terbaru
 * @param {string} currentVer - Versi saat ini
 * @returns {boolean} true jika versi terbaru lebih baru
 */
function isVersionNewer(latestVer, currentVer) {
  if (!latestVer || !currentVer) {
    throw new Error("Versi tidak boleh kosong");
  }

  // Hapus prefix 'v' jika ada, lalu pecah menjadi array angka
  const cleanLatest = latestVer.replace(/^v/, '').split('.').map(Number);
  const cleanCurrent = currentVer.replace(/^v/, '').split('.').map(Number);

  // Validasi bahwa semua bagian adalah angka valid
  if (cleanLatest.some(isNaN) || cleanCurrent.some(isNaN)) {
    throw new Error("Format versi tidak valid");
  }

  for (let i = 0; i < Math.max(cleanLatest.length, cleanCurrent.length); i++) {
    const partLatest = cleanLatest[i] || 0;
    const partCurrent = cleanCurrent[i] || 0;
    
    if (partLatest > partCurrent) return true;
    if (partLatest < partCurrent) return false;
  }
  
  return false; // Versi sama
}

/**
 * Mengambil versi terbaru dari GitHub dengan caching
 * @returns {Promise<Object>} Data release terbaru
 */
async function fetchLatestRelease() {
  const now = Date.now();
  
  // Gunakan cache jika masih valid
  if (versionCache.data && (now - versionCache.timestamp) < CONFIG.CACHE_TTL) {
    console.log("📦 Menggunakan cache untuk versi yt-dlp");
    return versionCache.data;
  }

  console.log("🔄 Mengambil versi terbaru dari GitHub API...");
  
  const response = await fetch(CONFIG.GITHUB_API_URL, {
    headers: {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": CONFIG.USER_AGENT,
    },
    // Timeout 10 detik
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("Rate limit GitHub API tercapai. Coba lagi nanti.");
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  // Update cache
  versionCache = {
    data,
    timestamp: now,
  };

  return data;
}

/**
 * Format pesan berdasarkan status update
 * @param {Object} data - Data release dari GitHub
 * @param {string} currentVersion - Versi saat ini
 * @returns {Object} Pesan yang diformat
 */
function formatUpdateMessage(data, currentVersion) {
  const latestTag = data.tag_name;
  const isNewer = isVersionNewer(latestTag, currentVersion);
  
  if (isNewer) {
    const publishedAt = new Date(data.published_at).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    return {
      text: `🚀 <b>Update Tersedia!</b>\n\n` +
            `📌 Versi Anda: <code>${currentVersion}</code>\n` +
            `✨ Versi Terbaru: <code>${latestTag}</code>\n` +
            `📅 Dirilis: ${publishedAt}\n\n` +
            `🔗 <a href="${data.html_url}">Lihat Release Notes & Download</a>`,
      parse_mode: "HTML",
    };
  } else {
    return {
      text: `✅ <b>Sudah Versi Terbaru!</b>\n\n` +
            `📌 Versi Anda: <code>${currentVersion}</code>\n` +
            `✨ Versi di GitHub: <code>${latestTag}</code>\n\n` +
            `💡 Tidak perlu update saat ini.`,
      parse_mode: "HTML",
    };
  }
}

export default (bot) => {
  /**
   * Command untuk mengecek update yt-dlp
   * Usage: /releases
   */
  bot.command("releases", async (ctx) => {
    try {
      // Kirim pesan loading
      const loadingMsg = await ctx.reply("⏳ Sedang mengecek versi terbaru yt-dlp di GitHub...");

      // Ambil data release terbaru
      const data = await fetchLatestRelease();
      const latestTag = data.tag_name;

      // Validasi tag name
      if (!latestTag) {
        throw new Error("Tidak dapat menemukan tag versi dari GitHub");
      }

      // Format dan kirim pesan
      const message = formatUpdateMessage(data, CONFIG.CURRENT_YTDLP_VERSION);
      
      await ctx.editMessageText(message.text, {
        parse_mode: message.parse_mode,
        disable_web_page_preview: true,
      });

      // Log untuk monitoring
      console.log(`[YTDLP Check] Current: ${CONFIG.CURRENT_YTDLP_VERSION}, Latest: ${latestTag}`);

    } catch (error) {
      console.error("❌ Error cek update yt-dlp:", error.message);
      
      // Pesan error yang user-friendly
      const errorMessage = error.message.includes("Rate limit")
        ? "⚠️ <b>Rate Limit GitHub API</b>\n\n" +
          "Terlalu banyak permintaan dalam waktu singkat. Silakan coba lagi dalam beberapa menit."
        : "❌ <b>Gagal Mengecek Update</b>\n\n" +
          "Terjadi kesalahan saat menghubungi GitHub. Pastikan koneksi internet stabil atau coba lagi nanti.";
      
      try {
        await ctx.reply(errorMessage, { parse_mode: "HTML" });
      } catch (replyError) {
        console.error("Gagal mengirim pesan error:", replyError);
      }
    }
  });

  /**
   * Command admin untuk force refresh cache
   * Usage: /refresh-cache (hanya untuk admin)
   */
  bot.command("refresh-cache", async (ctx) => {
    // Cek apakah user adalah admin (sesuaikan dengan logic auth Anda)
    const isAdmin = ctx.from?.id === Number(process.env.ADMIN_ID);
    
    if (!isAdmin) {
      await ctx.reply("🚫 Command ini hanya tersedia untuk admin.");
      return;
    }

    try {
      // Clear cache
      versionCache = { data: null, timestamp: 0 };
      
      await ctx.reply("✅ Cache berhasil di-reset. Request berikutnya akan mengambil data fresh dari GitHub.");
      console.log("🔄 Cache yt-dlp version telah di-reset oleh admin");
      
    } catch (error) {
      console.error("Error reset cache:", error);
      await ctx.reply("❌ Gagal mereset cache.");
    }
  });
};