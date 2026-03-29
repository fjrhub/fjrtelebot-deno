import "jsr:@std/dotenv/load";
import { webhookCallback } from "npm:grammy";
import { bot } from "./bot.js";
import { registerHandlers } from "./handler.js";

registerHandlers(bot);

const handleUpdate = webhookCallback(bot, "std/http");

Deno.serve((req) => {
  // ❌ Tolak request selain POST (misalnya dari browser)
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // (optional tapi bagus) hanya terima JSON
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return new Response("Bad Request", { status: 400 });
  }

  // ✔️ lanjut ke grammY webhook
  return handleUpdate(req);
});
