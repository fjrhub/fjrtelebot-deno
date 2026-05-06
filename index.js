import "jsr:@std/dotenv/load";
import { webhookCallback } from "npm:grammy";
import { bot } from "./bot.js";
import { registerHandlers } from "./handler.js";

registerHandlers(bot);

const handleUpdate = webhookCallback(bot, "std/http");

// Ambil dari env
const OWNER_ID = Deno.env.get("OWNER_ID");

Deno.cron(
  "test-cron-0030",
  "30 17 * * *",
  async () => {
    try {
      const OWNER_ID = Deno.env.get("OWNER_ID");

      if (!OWNER_ID) {
        console.error("OWNER_ID belum diset");
        return;
      }

      await bot.api.sendMessage(
        OWNER_ID,
        "⏰ Cron jam 00:30 WIB jalan (tanpa timezone)",
      );

      console.log("Cron 00:30 WIB jalan");
    } catch (err) {
      console.error("Cron error:", err);
    }
  },
);

Deno.serve(handleUpdate);