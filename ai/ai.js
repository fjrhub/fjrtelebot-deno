import Groq from "npm:groq-sdk";
import { kv } from "../kv.js";

/* ================= GROQ CLIENT ================= */
const groq =
  globalThis._groq ?? new Groq({ apiKey: Deno.env.get("GROQ_API_KEY") });

globalThis._groq = groq;

/* ================= ASK AI ================= */
export async function askAI(prompt) {
  try {
    const res = await groq.chat.completions.create({
      model: "qwen/qwen3-32b",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 1,
      max_tokens: 1024,
    });

    return res.choices?.[0]?.message?.content || "❌ No response.";
  } catch (err) {
    console.error("AI error:", err);
    return "❌ Gagal ambil jawaban AI.";
  }
}

/* ================= SPLIT MESSAGE ================= */
export function splitMessage(text, limit = 4000) {
  const chunks = [];

  while (text.length > limit) {
    let idx = text.lastIndexOf("\n\n", limit);

    if (idx === -1) idx = text.lastIndexOf("\n", limit);
    if (idx === -1) idx = text.lastIndexOf(" ", limit);
    if (idx === -1) idx = limit;

    chunks.push(text.slice(0, idx).trim());
    text = text.slice(idx).trim();
  }

  if (text.length) chunks.push(text);

  return chunks;
}

/* ================= ESCAPE TELEGRAM MARKDOWN ================= */
export function escapeMarkdownV2(text) {
  return text.replace(/([_*[\]()~`>#+=|{}.!\\-])/g, "\\$1");
}

/* ================= SAFE TELEGRAM FORMAT ================= */
export function formatTelegramMarkdown(text) {
  let escaped = escapeMarkdownV2(text);

  // Restore bold **text** -> *text* (MarkdownV2)
  escaped = escaped.replace(/\\\*\\\*(.*?)\\\*\\\*/g, "*$1*");

  // Restore inline code
  escaped = escaped.replace(/\\`([^`]+)\\`/g, "`$1`");

  return escaped;
}

/* ================= CLEAN AI RESPONSE ================= */
export function cleanAIResponse(text) {
  return (
    text
      // Hapus <think> atau <think attr>...</think>
      .replace(/(?:<think\b[^>]*>|<think>)[\s\S]*?<\/think>/gi, "")

      // Fallback hapus sisa tag
      .replace(/<think\b[^>]*>|<\/think>|<think>/gi, "")

      // Heading markdown jadi bold
      .replace(/^#{1,6}\s+(.+)$/gm, "**$1**")

      // Rapikan spasi dalam bold
      .replace(/\*\*(.+?)\s+\*\*/g, "**$1**")

      .trim()
  );
}

/* ================= SEND AI MESSAGE ================= */
export async function sendAIMessage(ctx, prompt) {
  await ctx.replyWithChatAction("typing");

  try {
    let reply = await askAI(prompt);

    reply = cleanAIResponse(reply);

    for (const chunk of splitMessage(reply)) {
      try {
        const formatted = formatTelegramMarkdown(chunk);

        await ctx.reply(formatted, {
          parse_mode: "MarkdownV2",
          disable_web_page_preview: true,
        });
      } catch (err) {
        console.error("Markdown Error:", err);

        await ctx.reply(chunk, {
          disable_web_page_preview: true,
        });
      }
    }
  } catch (err) {
    console.error("AI ERROR:", err);

    await ctx.reply("❌ Gagal mengambil jawaban AI.");
  }
}
