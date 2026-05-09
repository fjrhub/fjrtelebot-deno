import { askAI } from "../ai/core.js";

/* ================= UTILS (Bersihin & Format) ================= */
function cleanAIResponse(text) {
  return text
    // Hapus <think> atau <think attr>
    .replace(/(?:<think\b[^>]*>|<think>)[\s\S]*?<\/think>/gi, "")
    // Fallback hapus sisa tag
    .replace(/<think\b[^>]*>|<\/think>|<think>/gi, "")
    // Heading jadi bold
    .replace(/^#{1,6}\s+(.+)$/gm, "**$1**")
    // Rapikan spasi dalam bold
    .replace(/\*\*(.+?)\s+\*\*/g, "**$1**")
    .trim();
}

function escapeMarkdownV2(text) {
  return text.replace(/([_*[\]()~`>#+=|{}.!\\-])/g, "\\$1");
}

function formatTelegramMarkdown(text) {
  let escaped = escapeMarkdownV2(text);
  // Restore bold
  escaped = escaped.replace(/\\\*\\\*(.*?)\\\*\\\*/g, "*$1*");
  // Restore inline code
  escaped = escaped.replace(/\\`([^`]+)\\`/g, "`$1`");
  return escaped;
}

/* ================= DAILY CRON ================= */
export function registerDailyCron(bot) {
  Deno.cron("daily-ai", "45 16 * * *", async () => {
    try {
      const OWNER_ID = Deno.env.get("OWNER_ID");
      if (!OWNER_ID) throw new Error("OWNER_ID env tidak ditemukan");

      const question = "Berikan insight singkat tentang trading hari ini";
      
      // 1. Ambil jawaban AI
      let answer = await askAI(question);
      
      // 2. Bersihkan <think> & rapikan
      answer = cleanAIResponse(answer);
      
      // 3. Escape & format untuk Telegram MarkdownV2
      const formatted = formatTelegramMarkdown(answer);

      // 4. Kirim dengan parse_mode aktif
      await bot.api.sendMessage(OWNER_ID, formatted, {
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      });

      console.log("✅ Cron AI 23:45 WIB (TEST) berhasil dikirim");
    } catch (err) {
      console.error("❌ Cron AI Error:", err);
      
      // Fallback plain text kalau markdown error
      try {
        const OWNER_ID = Deno.env.get("OWNER_ID");
        await bot.api.sendMessage(OWNER_ID, "❌ Gagal format markdown. Cek log.", {
          disable_web_page_preview: true,
        });
      } catch {}
    }
  });
}