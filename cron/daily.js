import { askAI, cleanAIResponse, formatTelegramMarkdown } from "../ai/ai.js";

export function registerDailyCron(bot) {
  // ⚠️ Deno.cron default pakai UTC. 06:00 WIB = 23:00 UTC (hari sebelumnya)
  Deno.cron("daily-morning-brief", "0 23 * * *", async () => {
    try {
      const OWNER_ID = Deno.env.get("OWNER_ID");
      if (!OWNER_ID) throw new Error("OWNER_ID env tidak ditemukan");

      const question = `🌅 Morning Brief Pagi Ini

Buatkan laporan singkat yang informatif & memotivasi untuk memulai hari. Format wajib:
1. 📊 Ringkasan kondisi pasar/global atau 2 berita penting terkini
2. 🧠 Insight/Tip singkat untuk fokus & produktivitas hari ini
3. ☕ Reminder santai pas bangun tidur (hidrasi, stretching, atau prioritas hari ini)

Gunakan bahasa Indonesia yang santai, padat, positif, dan maksimal 250 kata. Siap baca langsung saat baru melek.`;

      let answer = await askAI(question);
      answer = cleanAIResponse(answer);
      const formatted = formatTelegramMarkdown(answer);

      await bot.api.sendMessage(OWNER_ID, formatted, {
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      });

      console.log("✅ Morning Brief berhasil dikirim (06:00 WIB)");
    } catch (err) {
      console.error("❌ Cron Morning AI Error:", err);
    }
  });
}
