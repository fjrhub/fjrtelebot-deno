import "jsr:@std/dotenv/load";
import { webhookCallback } from "npm:grammy";
import { bot } from "./bot.js";
import { registerHandlers } from "./handler.js";

registerHandlers(bot);

const handleUpdate = webhookCallback(bot, "std/http");

// Ambil dari env
const OWNER_ID = Deno.env.get("OWNER_ID");

// =========================
// CRON TEST JAM 00:10
// =========================
Deno.cron("test-cron-0015", "15 0 * * *", async () => {
  try {
    const OWNER_ID = Deno.env.get("OWNER_ID");

    if (!OWNER_ID) {
      console.error("OWNER_ID belum diset");
      return;
    }

    await bot.api.sendMessage(
      OWNER_ID,
      "🧪 Test cron jam 00:15 berhasil!"
    );

    console.log("Cron 00:15 jalan");
  } catch (err) {
    console.error(err);
  }
});

Deno.serve(handleUpdate);