// Simulasi versi yt-dlp yang sedang "dijalankan" oleh bot/server Anda saat ini.
// Di produksi, ini sebaiknya diambil dari database atau file config.
const CURRENT_YTDLP_VERSION = "2024.07.01"; 

// Fungsi helper untuk membandingkan versi (Support format YYYY.MM.DD yt-dlp & SemVer)
function isVersionNewer(latestVer, currentVer) {
    // Hapus prefix 'v' jika ada, lalu pecah menjadi array angka
    const cleanLatest = latestVer.replace(/^v/, '').split('.').map(Number);
    const cleanCurrent = currentVer.replace(/^v/, '').split('.').map(Number);

    for (let i = 0; i < Math.max(cleanLatest.length, cleanCurrent.length); i++) {
        const partLatest = cleanLatest[i] || 0;
        const partCurrent = cleanCurrent[i] || 0;
        
        if (partLatest > partCurrent) return true;  // Versi GitHub lebih baru
        if (partLatest < partCurrent) return false; // Versi lokal lebih baru
    }
    return false; // Versi sama
}

export default (bot) => {
  // Command baru untuk mengecek update yt-dlp
  bot.command("releases", async (ctx) => {
    try {
      await ctx.reply("⏳ Sedang mengecek versi terbaru yt-dlp di GitHub...");

      // Fetch ke GitHub API
      const response = await fetch("https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest", {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "Telegraf-YTDLP-Checker" // Header User-Agent WAJIB ada
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      const latestTag = data.tag_name; // Contoh hasil: "2024.08.06"

      // Cek apakah versi terbaru lebih baru dari versi saat ini
      if (isVersionNewer(latestTag, CURRENT_YTDLP_VERSION)) {
        await ctx.reply(
          `🚀 <b>Update Tersedia!</b>\n\n` +
          `Versi Anda: <code>${CURRENT_YTDLP_VERSION}</code>\n` +
          `Versi Terbaru: <code>${latestTag}</code>\n\n` +
          `🔗 <a href="${data.html_url}">Lihat Release Notes & Download</a>`,
          { parse_mode: "HTML" }
        );
      } else {
        await ctx.reply(
          `✅ <b>Sudah Versi Terbaru!</b>\n\n` +
          `Versi Anda saat ini: <code>${CURRENT_YTDLP_VERSION}</code>\n` +
          `Versi di GitHub: <code>${latestTag}</code>`,
          { parse_mode: "HTML" }
        );
      }

    } catch (error) {
      console.error("Error cek update yt-dlp:", error);
      ctx.reply("❌ Gagal mengecek update dari GitHub. Pastikan koneksi internet stabil atau coba lagi nanti.");
    }
  });
};