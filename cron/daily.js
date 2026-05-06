import { askAI } from "../ai/core.js";

export function registerDailyCron(bot) {
  Deno.cron("daily-0212", "12 19 * * *", async () => {
  try {
    const OWNER_ID = Deno.env.get("OWNER_ID");

    if (!OWNER_ID) {
      console.error("OWNER_ID belum diset");
      return;
    }

    await bot.api.sendMessage(
      OWNER_ID,
      "⏰ Cron jam 02:12 WIB jalan",
    );

    console.log("Cron 02:12 WIB jalan");
  } catch (err) {
    console.error("Cron error:", err);
  }
});
}