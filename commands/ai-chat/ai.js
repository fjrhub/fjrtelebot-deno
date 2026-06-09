import Groq from "npm:groq-sdk";
import { kv } from "../../kv.js";

/* ================= GROQ CLIENT ================= */
const groq = globalThis._groq ?? new Groq({ apiKey: Deno.env.get("GROQ_API_KEY") });
globalThis._groq = groq;

/* ================= HISTORY KEY RESOLVER ================= */
function getHistoryKey(ctx) {
  if (ctx.chat.type === "private") return ["history", "user", ctx.from.id];
  return ["history", "group", ctx.chat.id];
}

async function getHistory(ctx) {
  const key = getHistoryKey(ctx);
  const res = await kv.get(key);
  return res.value || [];
}

async function saveHistory(ctx, messages) {
  const key = getHistoryKey(ctx);
  await kv.set(key, messages.slice(-20));
}

/* ================= HISTORY TRIM ================= */
function trimHistorySafe(history, maxChars = 4500) {
  let chars = 0;
  const kept = [];
  for (let i = history.length - 1; i >= 0; i--) {
    chars += (history[i].content?.length || 0);
    if (chars > maxChars) break;
    kept.unshift(history[i]);
  }
  return kept;
}

/* ================= MESSAGE FORMATTER ================= */
function splitMessage(text, limit = 4000) {
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
  let last = 0, match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) segments.push(escapeMarkdownV2(text.slice(last, match.index)));
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
  for (const chunk of splitMessage(text, 4000)) {
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

/* ================= MODEL FETCHER (OPTIMIZED FOR SERVERLESS) ================= */
async function getCurrentModel() {
  try {
    const res = await kv.get(["ai_model"], { cached: true });
    return res.value || "qwen/qwen3-32b";
  } catch (err) {
    console.error("[ModelFetch] Error:", err.message);
    return "qwen/qwen3-32b";
  }
}

/* ================= GROQ REQUEST ================= */
async function sendToGroq(messages) {
  try {
    const model = await getCurrentModel();
    
    const res = await groq.chat.completions.create({
      model,
      messages,
      temperature: 1,
      max_tokens: 2048, 
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
  const chatType = ctx.chat.type;
  const user = from?.username
    ? `@${from.username}`
    : from?.first_name
      ? from.first_name + (from.last_name ? ` ${from.last_name}` : "")
      : "Unknown";
  const chatInfo = chatType === "private" 
    ? `Chat: Private with ${user}` 
    : `Chat: Group "${ctx.chat.title || "Unknown"}" (ID: ${ctx.chat.id})`;
    
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
- ${chatInfo}
- Timezone: Asia/Jakarta
- Location: Mojokerto, Jawa Timur`;
}

/* ================= CORE AI HANDLER (NON-BLOCKING) ================= */
async function handleAICore(ctx, inputText) {
  // Langsung jalankan di background tanpa await apapun.
  // Ini menjamin handler webhook selesai dalam < 1 milidetik.
  runAIBackground(ctx, inputText).catch((err) => {
    console.error("[AI] Background uncaught error:", err);
    ctx.reply("❌ Terjadi error tidak terduga.").catch(() => {});
  });
}

// Pindahkan semua logika ke fungsi terpisah
async function runAIBackground(ctx, inputText) {
  await ctx.replyWithChatAction("typing");
  const history = await getHistory(ctx);
  const systemPrompt = buildSystemPrompt(ctx);
  
  const safeHistory = trimHistorySafe(history, 4500);
  
  const messages = [
    { role: "system", content: systemPrompt },
    ...safeHistory.map((m) => ({
      role: m.role === "ai" ? "assistant" : m.role,
      content: m.content,
    })),
    { role: "user", content: inputText },
  ];

  let reply;
  try {
    reply = await sendToGroq(messages);
  } catch (err) {
    if (err.isRateLimit) {
      await ctx.reply("⏳ Rate limit. Coba lagi sebentar.").catch(() => {});
      return;
    }
    if (err.isTooLarge) {
      try {
        reply = await sendToGroq([
          { role: "system", content: systemPrompt },
          { role: "user", content: inputText },
        ]);
      } catch (retryErr) {
        if (retryErr.isRateLimit) {
          await ctx.reply("⏳ Rate limit. Coba lagi sebentar.").catch(() => {});
        } else {
          await ctx.reply("❌ Terjadi error saat menghubungi AI.").catch(() => {});
        }
        return;
      }
    } else {
      console.error("[AI] Unexpected error:", err);
      await ctx.reply("❌ Terjadi error.").catch(() => {});
      return;
    }
  }
  
  await saveHistory(ctx, [
    ...history,
    { role: "user", content: inputText },
    { role: "ai", content: reply },
  ]);
  await sendMarkdownMessage(ctx, reply);
}

/* ================= HELP MESSAGE ================= */
function getHelpMessage() {
  return `*🤖 FJRToolsBot \\- AI Assistant*

*Commands:*
• /ai \\<pertanyaan\\> \\- Chat dengan AI
• /reset \\- Hapus history chat
• /history \\- Export history ke file JSON

*Features:*
• History terpisah: private \\(per user\\) & group \\(per chat\\)
• History tersimpan di KV \\(max 10 pasang pesan\\)
• Auto\\-trim history kalau terlalu panjang
• Support reply pesan bot
• Auto split pesan panjang`;
}

/* ================= EXPORT BOT HANDLER ================= */
export default (bot) => {
  bot.command("ai", async (ctx) => {
    const text = ctx.message?.text?.trim();
    const input = text.replace(/^\/ai(@\w+)?\s*/i, "").trim();

    if (!input || input === "help")
      return ctx.reply(getHelpMessage(), { parse_mode: "MarkdownV2" });

    await handleAICore(ctx, input);
  });

  bot.on("message:text", async (ctx) => {
    const text = ctx.message?.text?.trim();
    if (!text || text.startsWith("/")) return;
    if (ctx.message?.reply_to_message?.from?.id === ctx.me.id)
      await handleAICore(ctx, text);
  });
};