import { Bot } from "npm:grammy";

const TOKEN = Deno.env.get("TOKEN");

export const bot = new Bot(TOKEN);