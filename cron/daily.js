import { askAI } from "../ai/core.js";

export function registerDailyCron(bot) {
  Deno.cron("daily-ai", "0 19 * * *", async () => {
    try {
      const OWNER_ID = Deno.env.get("OWNER_ID");

      const question = "Berikan insight singkat tentang trading hari ini";
      const answer = await askAI(question);

      await bot.api.sendMessage(OWNER_ID, answer);

      console.log("Cron AI jalan");
    } catch (err) {
      console.error(err);
    }
  });
}