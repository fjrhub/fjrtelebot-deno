import "jsr:@std/dotenv/load";
import { webhookCallback } from "npm:grammy";
import { bot } from "./bot.js";
import { registerHandlers } from "./handler.js";

registerHandlers(bot);

const SECRET = Deno.env.get("TELEGRAM_SECRET");

const handleUpdate = webhookCallback(bot, "std/http");

Deno.serve((req) => {
  const url = new URL(req.url);

  // hanya POST ke "/" + validasi secret header
  if (
    url.pathname === "/" &&
    req.method === "POST" &&
    req.headers.get("x-telegram-bot-api-secret-token") === SECRET
  ) {
    return handleUpdate(req);
  }

  // favicon biar gak ganggu
  if (url.pathname === "/favicon.ico") {
    return new Response(null, { status: 204 });
  }

  // selain itu tolak cepat
  return new Response(null, { status: 404 });
});