import "jsr:@std/dotenv/load";
import { webhookCallback } from "npm:grammy";
import { bot } from "./bot.js";
import { registerHandlers } from "./handler.js";
import { registerCrons } from "./cron/index.js";

registerHandlers(bot);
registerCrons(bot);

// TAMBAHKAN OPSI onTimeout: "return" UNTUK MENCEGAH ERROR TIMEOUT
const handleUpdate = webhookCallback(bot, "std/http", {
  onTimeout: "return",
  timeoutMilliseconds: 10000, // 10 detik (bisa dinaikkan jika perlu)
});

Deno.serve(handleUpdate);