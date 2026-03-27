import "jsr:@std/dotenv/load";
import { webhookCallback } from "npm:grammy";
import { bot } from "./bot.js";
import { registerHandlers } from "./handler.js";

registerHandlers(bot);

const handleUpdate = webhookCallback(bot, "std/http");

Deno.serve((req) => {
  const url = new URL(req.url);

  // hanya POST ke "/" yang diproses
  if (url.pathname === "/" && req.method === "POST") {
    return handleUpdate(req);
  }

  // favicon biar gak error di log
  if (url.pathname === "/favicon.ico") {
    return new Response(null, { status: 204 });
  }

  // selain itu langsung ditolak
  return new Response(null, { status: 404 });
});