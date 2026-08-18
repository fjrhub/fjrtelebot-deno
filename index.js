// index.js (ROOT)
import "jsr:@std/dotenv/load";
import { webhookCallback } from "npm:grammy";
import { bot } from "./bot.js";
import { registerHandlers } from "./handler.js";
import { handleApiRequest } from "./api/index.js";

registerHandlers(bot);
const handleUpdate = webhookCallback(bot, "std/http");

Deno.serve(async (req) => {
  const { pathname } = new URL(req.url);

  // 🛡️ 1. PENGAWAL KHUSUS ROUTE /api (HEMAT CPU TIME)
  if (pathname.startsWith("/api")) {
    // BLOKIR langsung kalau bukan POST (misal: GET dari browser, favicon, bot scanner)
    if (req.method !== "POST") {
      return new Response("🚫 Access Denied. Only POST allowed.", { status: 403 });
    }

    // BLOKIR kalau tidak ada Secret Key (Biar gak bisa ditembak orang iseng via Postman)
    const secret = req.headers.get("x-vercel-secret");
    if (secret !== Deno.env.get("API_SECRET")) {
      return new Response("🚫 Unauthorized. Invalid Secret Key.", { status: 401 });
    }

    // Kalau lolos, baru serahkan ke worker
    return handleApiRequest(req);
  }

  // 2️⃣ POST ke Root → Webhook Telegram (Command bot normal)
  if (req.method === "POST") {
    try {
      return await handleUpdate(req);
    } catch (err) {
      console.error("[webhook error]", err.message);
      return new Response("Invalid Telegram update", { status: 400 });
    }
  }

  // 3️⃣ GET ke Root → Status Online (Aman, CPU time hampir 0)
  return new Response(
    JSON.stringify({ status: "online", bot: "@FJRToolsBot" }),
    { headers: { "Content-Type": "application/json" } }
  );
});