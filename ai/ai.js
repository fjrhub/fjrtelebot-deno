import { askAI } from "./core.js";
import { kv } from "../kv.js";

/* ================= HISTORY ================= */
function getHistoryKey(ctx) {
  if (ctx.chat.type === "private") return ["history", "user", ctx.from.id];
  return ["history", "group", ctx.chat.id];
}

async function getHistory(ctx) {
  const res = await kv.get(getHistoryKey(ctx));
  return res.value || [];
}

async function saveHistory(ctx, messages) {
  await kv.set(getHistoryKey(ctx), messages.slice(-10));
}

/* ================= FORMAT ================= */
function splitMessage(text, limit = 4000) {
  const chunks = [];
  while (text.length > limit) {
    chunks.push(text.slice(0, limit));
    text = text.slice(limit);
  }
  if (text) chunks.push(text);
  return chunks;
}

async function sendMessage(ctx, text) {
  for (const chunk of splitMessage(text)) {
    await ctx.reply(chunk).catch(() => {});
  }
}

/* ================= HANDLER ================= */
async function handleAI(ctx, input) {
  await ctx.replyWithChatAction("typing");

  const history = await getHistory(ctx);

  const messages = [
    ...history,
    { role: "user", content: input },
  ];

  const reply = await askAI(messages);

  await saveHistory(ctx, [
    ...history,
    { role: "user", content: input },
    { role: "assistant", content: reply },
  ]);

  await sendMessage(ctx, reply);
}

/* ================= EXPORT ================= */
export default (bot) => {
  bot.command("ai", async (ctx) => {
    const text = ctx.message?.text || "";
    const input = text.replace(/^\/ai(@\w+)?\s*/, "").trim();

    if (!input) {
      return ctx.reply("❌ Masukkan pertanyaan.\nContoh: /ai Apa itu trading?");
    }

    await handleAI(ctx, input);
  });

  // reply ke bot
  bot.on("message:text", async (ctx) => {
    if (ctx.message.reply_to_message?.from?.id === ctx.me.id) {
      await handleAI(ctx, ctx.message.text);
    }
  });
};