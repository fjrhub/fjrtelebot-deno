import { InputFile } from "npm:grammy";
import Groq from "npm:groq-sdk";
import { kv } from "../kv.js";

/* ================= CONFIG ================= */
if (!Deno.env.get("GROQ_API_KEY")) {
  throw new Error("Missing GROQ_API_KEY");
}

const MODEL = "openai/gpt-oss-120b";
const MAX_HISTORY_PAIRS = 10; // 10 pasang = 20 message (user + ai)
const TOKEN_LIMIT = 5000; // safety margin dari limit 6000 TPM
const CHARS_PER_TOKEN = 3.5; // estimasi: 1 token ≈ 3.5 karakter (Indonesia/mix)
const SAFE_LIMIT = 4000;

/* ================= GROQ CLIENT ================= */
const groq =
  globalThis._groq ?? new Groq({ apiKey: Deno.env.get("GROQ_API_KEY") });
globalThis._groq = groq;

/* ================= TOKEN ESTIMATOR ================= */
function estimateTokens(text) {
  return Math.ceil((text?.length ?? 0) / CHARS_PER_TOKEN);
}

function estimateMessagesTokens(messages) {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content) + 4, 0);
}

/* ================= HISTORY TRIMMER ================= */
/**
 * Trim history agar total token (system + history + input) tidak melebihi TOKEN_LIMIT.
 * Buang pasang terlama dari depan sampai muat.
 */
function trimHistoryToTokenLimit(history, systemPrompt, inputText) {
  const systemTokens = estimateTokens(systemPrompt) + 4;
  const inputTokens = estimateTokens(inputText) + 4;
  const overhead = systemTokens + inputTokens + 100; // buffer

  // Susun jadi pasangan [user, ai]
  let pairs = [];
  for (let i = 0; i + 1 < history.length; i += 2) {
    pairs.push([history[i], history[i + 1]]);
  }

  // Potong dari depan sampai estimasi token muat
  while (pairs.length > 0) {
    const flat = pairs.flatMap(([u, a]) => [
      { role: "user", content: u.content },
      { role: "assistant", content: a.content },
    ]);
    const total = overhead + estimateMessagesTokens(flat);
    if (total <= TOKEN_LIMIT) break;
    pairs.shift();
  }

  return pairs.flatMap(([u, a]) => [u, a]);
}

/* ================= KV HELPERS ================= */
async function getHistory(userId) {
  const res = await kv.get(["history", userId]);
  return res.value || [];
}

async function saveHistory(userId, messages) {
  const trimmed = messages.slice(-(MAX_HISTORY_PAIRS * 2));
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
    if (err.status === 429) {
      const e = new Error("rate_limit");
      e.isRateLimit = true;
      throw e;
    }
    if (err.status === 413) {
      const e = new Error("too_large");
      e.isTooLarge = true;
      throw e;
    }
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
  return `Kamu adalah FJRToolsBot, AI assistant yang friendly dan helpful.


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

  // Acknowledge dulu ke Telegram supaya webhook tidak timeout
  await ctx.replyWithChatAction("typing");

  const history = await getHistory(userId);
  const systemPrompt = buildSystemPrompt(ctx);

  // Trim history berdasarkan estimasi token sebelum dikirim ke Groq
  const trimmedHistory = trimHistoryToTokenLimit(
    history,
    systemPrompt,
    inputText,
  );

  if (trimmedHistory.length < history.length) {
    console.log(
      `[AI] History trimmed: ${history.length} → ${trimmedHistory.length} msg for user ${userId}`,
    );
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...trimmedHistory.map((m) => ({
      role: m.role === "ai" ? "assistant" : m.role,
      content: m.content,
    })),
    { role: "user", content: inputText },
  ];

  // Fire-and-forget: lepas dari webhook timeout grammY (hardcoded 10s)
  // Groq tetap diproses di background, response dikirim setelah selesai
  const run = async () => {
    let reply;

    try {
      reply = await sendToGroq(messages);
    } catch (err) {
      if (err.isRateLimit) {
        await ctx.reply("⏳ Rate limit. Coba lagi sebentar.").catch(() => {});
        return;
      }

      if (err.isTooLarge) {
        // Fallback: kirim tanpa history sama sekali
        console.warn(
          `[AI] Still too large after trim, retrying without history for user ${userId}`,
        );
        try {
          reply = await sendToGroq([
            { role: "system", content: systemPrompt },
            { role: "user", content: inputText },
          ]);
        } catch (retryErr) {
          if (retryErr.isRateLimit) {
            await ctx
              .reply("⏳ Rate limit. Coba lagi sebentar.")
              .catch(() => {});
          } else {
            await ctx
              .reply("❌ Terjadi error saat menghubungi AI.")
              .catch(() => {});
          }
          return;
        }
      } else {
        console.error("[AI] Unexpected error:", err);
        await ctx.reply("❌ Terjadi error.").catch(() => {});
        return;
      }
    }

    // Simpan ke history (pakai history asli, bukan trimmed)
    // trimming hanya untuk request ke Groq, bukan untuk storage
    await saveHistory(userId, [
      ...history,
      { role: "user", content: inputText },
      { role: "ai", content: reply },
    ]);

    await sendMarkdownMessage(ctx, reply);
  };

  // Deno: tidak ada waitUntil, jalankan tanpa await
  run().catch((err) => {
    console.error("[AI] run() uncaught error:", err);
    ctx.reply("❌ Terjadi error tidak terduga.").catch(() => {});
  });
}

/* ================= BOT COMMANDS ================= */
export default (bot) => {
  bot.command("ai", async (ctx) => {
    const text = ctx.message?.text?.trim();
    const userId = ctx.from.id;

    const input = text.replace(/^\/ai(@\w+)?\s*/i, "").trim();

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
      const help = `*🤖 FJRToolsBot \\- AI Assistant*

*Commands:*
• /ai <pertanyaan> \\- Chat dengan AI
• /ai reset \\- Hapus history chat
• /ai history \\- Export history ke file JSON
• /ai help \\- Tampilkan bantuan ini

*Features:*
• History tersimpan di KV \\(max ${MAX_HISTORY_PAIRS} pasang pesan\\)
• Auto\\-trim history kalau terlalu panjang
• Support reply pesan bot
• Auto split pesan panjang`;

      return ctx.reply(help, { parse_mode: "MarkdownV2" });
    }

    if (!input) {
      return ctx.reply(
        "Gunakan:\n/ai <pertanyaan>\n\nContoh: /ai apa itu javascript?\n\nKetik /ai help untuk bantuan.",
      );
    }

    await handleAICore(ctx, input);
  });

  bot.on("message:text", async (ctx) => {
    const text = ctx.message?.text?.trim();
    if (!text || text.startsWith("/")) return;

    const replied = ctx.message?.reply_to_message;
    if (replied?.from?.id === ctx.me.id) {
      await handleAICore(ctx, text);
    }
  });
};
