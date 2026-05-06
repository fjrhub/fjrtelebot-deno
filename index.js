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
Deno.cron("test-cron-0010", "10 0 * * *", async () => {
  try {
    if (!OWNER_ID) {
      console.error("OWNER_ID belum diset di .env");
      return;
    }

    await bot.api.sendMessage(
      OWNER_ID,
      "🧪 Test cron jam 00:10 berhasil!"
    );

    console.log("Cron jalan ke OWNER_ID");
  } catch (err) {
    console.error("Cron error:", err);
  }
});

Deno.serve(handleUpdate);