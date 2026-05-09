import { askAI, cleanAIResponse, formatTelegramMarkdown } from "./ai.js";

export function registerDailyCron(bot) {
  Deno.cron("daily-ai", "0 17 * * *", async () => {
    try {
      const OWNER_ID = Deno.env.get("OWNER_ID");
      if (!OWNER_ID) throw new Error("OWNER_ID env tidak ditemukan");

      const question = "Berikan insight singkat tentang trading hari ini";
      
      // 1. Ambil response mentah
      let answer = await askAI(question);
      
      // 2. Bersihkan & format pakai fungsi dari ai.js
      answer = cleanAIResponse(answer);
      const formatted = formatTelegramMarkdown(answer);

      // 3. Kirim dengan MarkdownV2 aktif
      await bot.api.sendMessage(OWNER_ID, formatted, {
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      });

      console.log("✅ Cron AI 00:00 WIB berhasil dikirim");
    } catch (err) {
      console.error("❌ Cron AI Error:", err);
    }
  });
}