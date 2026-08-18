// index.js (ROOT) — ENTRY POINT UTAMA Deno Deploy
import "jsr:@std/dotenv/load";
import { webhookCallback } from "npm:grammy";
import { bot } from "./bot.js";
import { registerHandlers } from "./handler.js";
import { handleApiRequest } from "./api/index.js";

registerHandlers(bot);

const handleUpdate = webhookCallback(bot, "std/http");

Deno.serve(async (req) => {
  const { pathname } = new URL(req.url);

  // 1️⃣ Route /api → Worker endpoint (buat Vercel & testing browser)
  if (pathname.startsWith("/api")) {
    return handleApiRequest(req);
  }

  // 2️⃣ POST → Webhook Telegram (biar semua command bot TETAP jalan)
  if (req.method === "POST") {
    try {
      return await handleUpdate(req);
    } catch (err) {
      console.error("[webhook error]", err.message);
      return new Response("Invalid Telegram update", { status: 400 });
    }
  }

  // 3️⃣ GET / → Status online (biar gak crash kalau dibuka di browser)
  return new Response(
    JSON.stringify({ status: "online", bot: "@FJRToolsBot", worker: "/api" }, null, 2),
    { headers: { "Content-Type": "application/json" } }
  );
});