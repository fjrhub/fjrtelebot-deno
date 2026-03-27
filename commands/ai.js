import { InputFile } from "npm:grammy";
import Groq from "npm:groq-sdk";
import { kv } from "../kv.js";

/* ================= CONFIG ================= */
if (!Deno.env.get("GROQ_API_KEY")) {
  throw new Error("Missing GROQ_API_KEY");
}

const MODEL = "qwen/qwen3-32b";
const MAX_HISTORY = 30;
const SAFE_LIMIT = 4000;

/* ================= GROQ CLIENT ================= */
const groq =
  globalThis._groq ?? new Groq({ apiKey: Deno.env.get("GROQ_API_KEY") });
globalThis._groq = groq;

/* ================= KV HELPERS ================= */
async function getHistory(userId) {
  const res = await kv.get(["history", userId]);
  return res.value || [];
}

async function saveHistory(userId, messages) {
  const trimmed = messages.slice(-MAX_HISTORY * 2);
  await kv.set(["history", userId], trimmed);
}

async function clearHistory(userId) {
  await kv.delete(["history", userId]);
}

/* ================= MESSAGE UTILS ================= */
function splitMessage(text, limit = SAFE_LIMIT) {
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

function escapeMarkdownV2(text) {
  return text.replace(/([_*[\]()~`>#+=|{}.!\\-])/g, "\\$1");
}

function convertToMarkdownV2(text) {
  const segments = [];
  const regex =
    /```[\s\S]*?```|`[^`]+`|\*\*(.+?)\*\*|__(.+?)__|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)|\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0,
    match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last)
      segments.push(escapeMarkdownV2(text.slice(last, match.index)));
    const [full, b1, b2, i1, i2, lt, url] = match;
    if (full.startsWith("```"))
      segments.push("```" + full.slice(3, -3).replace(/`/g, "\\`") + "```");
    else if (full.startsWith("`"))
      segments.push("`" + full.slice(1, -1).replace(/`/g, "\\`") + "`");
    else if (b1 || b2) segments.push("*" + escapeMarkdownV2(b1 || b2) + "*");
    else if (i1 || i2) segments.push("_" + escapeMarkdownV2(i1 || i2) + "_");
    else if (lt && url)
      segments.push(`[${escapeMarkdownV2(lt)}](${url.replace(/[)]/g, "\\)")})`);
    else segments.push(escapeMarkdownV2(full));
    last = match.index + full.length;
  }
  if (last < text.length) segments.push(escapeMarkdownV2(text.slice(last)));
  return segments.join("");
}

async function sendMarkdownMessage(ctx, text) {
  for (const chunk of splitMessage(text)) {
    let converted;
    try {
      converted = convertToMarkdownV2(chunk);
    } catch {
      converted = null;
    }
    if (converted) {
      try {
        await ctx.api.sendMessage(ctx.chat.id, converted, {
          parse_mode: "MarkdownV2",
          disable_web_page_preview: true,
        });
        continue;
      } catch (e) {
        console.error("MarkdownV2 error:", e.message);
      }
    }
    try {
      await ctx.api.sendMessage(ctx.chat.id, chunk, {
        disable_web_page_preview: true,
      });
    } catch (e) {
      console.error("Plain send error:", e.message);
    }
  }
}

/* ================= GROQ REQUEST ================= */
async function sendToGroq(messages) {
  try {
    const res = await groq.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 1,
      max_tokens: 5500,
    });
    let content = res.choices?.[0]?.message?.content || "❌ No response.";
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    content = content.replace(/^#{1,6}\s+\*\*(.+?)\s*\*\*\s*$/gm, "**$1**");
    content = content.replace(/^#{1,6}\s+(.+)$/gm, "**$1**");
    content = content.replace(/\*\*(.+?)\s+\*\*/g, "**$1**");
    return content;
  } catch (err) {
    console.error("GROQ ERROR:", err);
    if (err.status === 429) return "⏳ Rate limit. Coba lagi sebentar.";
    if (err.status === 401) return "❌ API key salah.";
    return "❌ Gagal mengambil jawaban AI.";
  }
}

/* ================= SYSTEM PROMPT ================= */
function buildSystemPrompt(ctx) {
  const from = ctx.from;
  const user = from?.username
    ? `@${from.username}`
    : from?.first_name
      ? from.first_name + (from.last_name ? ` ${from.last_name}` : "")
      : "Unknown";
  return `Kamu adalah CahayaMalamBot, AI assistant yang friendly dan helpful.


**Karakter:**
- Santai, friendly, kayak temen ngobrol
- Langsung to the point, gak pake filler words
- Boleh punya opini, boleh disagree, boleh ketawa
- Pake bahasa Indonesia casual
- Pake emoji secukupnya 🎯


**Format Response:**
- Gunakan **bold** untuk penekanan
- Gunakan • untuk bullet points
- Gunakan \`backticks\` untuk inline code
- Gunakan triple backtick untuk code block
- Paragraf pendek, mudah dibaca
- Jangan gunakan tabel markdown
- DILARANG KERAS gunakan heading markdown (# ## ### #### dst) dalam bentuk apapun, ganti dengan **bold** kalau butuh judul


**PENTING - Telegram Limit:**
- Sistem otomatis memecah dan mengirim jawaban, TIDAK perlu kamu urus sama sekali
- DILARANG KERAS: nulis "Bagian 1", "Bagian 2", "lanjut ke bagian berikutnya", atau apapun yang nunjukin kamu sadar soal limit
- DILARANG KERAS: tanya izin, minta konfirmasi, atau kasih preview sebelum jawab
- Cukup tulis jawaban lengkap dari awal sampai akhir seperti biasa, seolah tidak ada limit


**Rules:**
- Jawab lengkap tapi jangan bertele-tele
- JANGAN tampilkan <think> atau proses berpikir
- Langsung jawaban final
- Kalau tidak tahu, katakan jujur
- Kalau butuh info, tanya


**Context:**
- User: ${user}
- Timezone: Asia/Jakarta
- Location: Mojokerto, Jawa Timur`;
}

/* ================= CORE AI HANDLER ================= */
async function handleAICore(ctx, inputText) {
  const userId = ctx.from.id;

  await ctx.replyWithChatAction("typing");

  const history = await getHistory(userId);

  const groqHistory = history.map((m) => ({
    role: m.role === "ai" ? "assistant" : m.role,
    content: m.content,
  }));

  const messages = [
    { role: "system", content: buildSystemPrompt(ctx) },
    ...groqHistory,
    { role: "user", content: inputText },
  ];

  const reply = await sendToGroq(messages);

  await saveHistory(userId, [
    ...history,
    { role: "user", content: inputText },
    { role: "ai", content: reply },
  ]);

  await sendMarkdownMessage(ctx, reply);
}

/* ================= BOT COMMANDS ================= */
export default (bot) => {
  bot.command("ai", async (ctx) => {
    const text = ctx.message?.text?.trim();
    const userId = ctx.from.id;

    const input = text.replace(/^\/ai\s*/i, "").trim();

    // --- FITUR STOP BARU ---
    if (input === "stop" || text.toLowerCase() === "/ai stop") {
      return ctx.reply(
        "✅ **AI Berhenti**\n\nBot tidak akan merespon chat ini sampai kamu mengetik perintah /ai baru.",
        { parse_mode: "Markdown" },
      );
    }
    // -----------------------

    if (text === "/ai reset" || input === "reset") {
      await clearHistory(userId);
      return ctx.reply("✅ History dihapus.");
    }

    if (text === "/ai history" || input === "history") {
      const history = await getHistory(userId);
      if (!history.length) return ctx.reply("History kosong.");

      const data = {
        exportedAt: new Date().toISOString(),
        userId,
        messageCount: history.length,
        messages: history.map((m) => ({
          role: m.role === "ai" ? "assistant" : m.role,
          content: m.content,
        })),
      };
      const buf = new TextEncoder().encode(JSON.stringify(data, null, 2));

      return ctx.replyWithDocument(
        new InputFile(buf, `ai-history-${userId}-${Date.now()}.json`),
        {
          caption: `📦 *Export History*\n• ${history.length} pesan`,
          parse_mode: "Markdown",
        },
      );
    }

    if (text === "/ai help" || input === "help") {
      const help = `*🤖 FJRToolsBot - AI Assistant*

*Commands:*
• /ai <pertanyaan> - Chat dengan AI
• /ai stop - **Berhenti** merespon (bypass rate limit)
• /ai reset - Hapus history chat
• /ai history - Export history ke file JSON
• /ai help - Tampilkan bantuan ini

*Features:*
• History tersimpan di KV (max 30 pesan)
• Support reply pesan bot
• Auto split pesan panjang`;

      return ctx.reply(help, { parse_mode: "Markdown" });
    }

    if (!input) {
      return ctx.reply(
        "Gunakan:\n/ai <pertanyaan>\n\nContoh: /ai apa itu javascript?\n\nKetik /ai help untuk bantuan.",
      );
    }

    try {
      await handleAICore(ctx, input);
    } catch (err) {
      console.error(err);
      ctx.reply("❌ Terjadi error.");
    }
  });

  bot.on("message:text", async (ctx) => {
    const text = ctx.message?.text?.trim();
    if (!text || text.startsWith("/")) return;

    const replied = ctx.message?.reply_to_message;
    if (replied && replied.from?.is_bot) {
      try {
        await handleAICore(ctx, text);
      } catch (err) {
        console.error(err);
        ctx.reply("❌ Terjadi error.");
      }
    }
  });
};