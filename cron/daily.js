export function registerDailyCron(bot) {
  Deno.cron("daily-0030", "30 17 * * *", async () => {
    try {
      const OWNER_ID = Deno.env.get("OWNER_ID");

      if (!OWNER_ID) {
        console.error("OWNER_ID belum diset");
        return;
      }

      await bot.api.sendMessage(
        OWNER_ID,
        "⏰ Cron jam 00:30 WIB jalan",
      );

      console.log("Cron daily jalan");
    } catch (err) {
      console.error("Cron error:", err);
    }
  });
}