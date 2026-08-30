// Deno: index.js (ROOT)
import "jsr:@std/dotenv/load";
import { webhookCallback } from "npm:grammy";
import { bot } from "./bot.js";
import { registerHandlers } from "./handler.js";
import { handleApiRequest } from "./api/index.js"; // Import Worker

registerHandlers(bot);
const handleUpdate = webhookCallback(bot, "std/http");

Deno.serve(async (req) => {
  // 🛡️ BLOKIR SEMUA REQUEST SELAIN POST (Hemat CPU secara drastis!)
  if (req.method !== "POST") {
    return new Response("Forbidden", { status: 403 });
  }

  const { pathname } = new URL(req.url);

  // 1️⃣ Route /api → Khusus menerima kiriman dari Vercel
  if (pathname.startsWith("/api")) {
    const secret = req.headers.get("x-vercel-secret");
    if (secret !== Deno.env.get("API_SECRET")) {
      return new Response("Unauthorized", { status: 401 });
    }
    return handleApiRequest(req);
  }

  // 2️⃣ Route / (Root) → Webhook Telegram (Untuk command bot normal)
  try {
    return await handleUpdate(req);
  } catch (err) {
    console.error("[webhook error]", err.message);
    // ⚠️ PERUBAHAN KRUSIAL: 
    // Kembalikan 200 OK agar Telegram TIDAK RETRY.
    // Kita asumsikan error sudah ditangani di level handler (ctx.reply).
    return new Response("OK", { status: 200 }); 
  }
});