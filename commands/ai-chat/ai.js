import { sendToAI } from "../../config/ai_services.js";
import { kv } from "../../kv.js";

/* ================= HISTORY KEY RESOLVER ================= */
function getHistoryKey(ctx) {
  return ctx.chat.type === "private" 
    ? ["history", "user", ctx.from.id] 
    : ["history", "group", ctx.chat.id];
}

async function getHistory(ctx) {
  const res = await kv.get(getHistoryKey(ctx));
  return res.value || [];
}

async function saveHistory(ctx, messages) {
  await kv.set(getHistoryKey(ctx), messages.slice(-20)); // Max 20 pesan (10 pasang)
}

/* ================= HISTORY TRIM (Optimized O(N)) ================= */
function trimHistorySafe(history, maxChars = 4500) {
  let chars = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    chars += history[i].content?.length || 0;
    if (chars > maxChars) {
      return history.slice(i + 1); // Langsung return slice, lebih efisien
    }
  }
  return history; // Jika total masih di bawah maxChars
}

/* ================= MESSAGE FORMATTER ================= */
function splitMessage(text, limit = 4000) {
  const chunks = [];
  let remaining = text;
  
  while (remaining.length > limit) {
    let idx = remaining.lastIndexOf("\n\n", limit);
    if (idx < limit * 0.4) idx = remaining.lastIndexOf("\n", limit);
    if (idx < limit * 0.4) idx = remaining.lastIndexOf(" ", limit);
    if (idx < limit * 0.4) idx = limit; // Fallback: potong paksa

    const chunk = remaining.slice(0, idx).trim();
    if (chunk) chunks.push(chunk); // Cegah chunk kosong
    
    remaining = remaining.slice(idx).trim();
  }
  
  if (remaining.length) chunks.push(remaining);
  return chunks;
}

function escapeMarkdownV2(text) {
  return text.replace(/([_*[\]()~`>#+=|{}.!\\-])/g, "\\$1");
}

function convertToMarkdownV2(text) {
  const segments = [];
  const regex = /```[\s\S]*?```|`[^`]+`|\*\*(.+?)\*\*|__(.+?)__|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)|\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0, match;
  
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      segments.push(escapeMarkdownV2(text.slice(last, match.index)));
    }
    
    const [full, b1, b2, i1, i2, lt, url] = match;
    
    if (full.startsWith("```")) {
      segments.push("```" + full.slice(3, -3).replace(/`/g, "\\`") + "```");
    } else if (full.startsWith("`")) {
      segments.push("`" + full.slice(1, -1).replace(/`/g, "\\`") + "`");
    } else if (b1 || b2) {
      segments.push("*" + escapeMarkdownV2(b1 || b2) + "*");
    } else if (i1 || i2) {
      segments.push("_" + escapeMarkdownV2(i1 || i2) + "_");
    } else if (lt && url) {
      segments.push(`[${escapeMarkdownV2(lt)}](${url.replace(/[)]/g, "\\)")})`);
    } else {
      segments.push(escapeMarkdownV2(full));
    }
      
    last = match.index + full.length;
  }
  
  if (last < text.length) {
    segments.push(escapeMarkdownV2(text.slice(last)));
  }
  return segments.join("");
}

async function sendMarkdownMessage(ctx, text) {
  const chunks = splitMessage(text, 4000);
  
  for (const chunk of chunks) {
    let sent = false;
    try {
      const converted = convertToMarkdownV2(chunk);
      await ctx.reply(converted, {
        parse_mode: "MarkdownV2",
        link_preview_options: { is_disabled: true },
      });
      sent = true;
    } catch (e) {
      console.warn("MarkdownV2 send error, falling back to plain text:", e.description || e.message);
    }
    
    if (!sent) {
      try {
        await ctx.reply(chunk, {
          link_preview_options: { is_disabled: true },
        });
      } catch (e) {
        console.error("Plain text send error:", e.description || e.message);
      }
    }
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
      
  const chatInfo = ctx.chat.type === "private" 
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
- JANGAN tampilkan <thinking> atau proses berpikir
- Langsung jawaban final
- Kalau tidak tahu, katakan jujur
- Kalau butuh info, tanya

**Context:**
- User: ${user}
- ${chatInfo}
- Timezone: Asia/Jakarta
- Location: Mojokerto, Jawa Timur`;
}

/* ================= CORE AI HANDLER ================= */
async function handleAICore(ctx, inputText) {
  // Non-blocking chat action
  ctx.sendChatAction("typing").catch(() => {});

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
    reply = await sendToAI(messages);
  } catch (err) {
    if (err.isRateLimit) {
      return ctx.reply("⏳ Rate limit. Coba lagi sebentar.").catch(() => {});
    }
    
    if (err.isTooLarge) {
      try {
        // Retry tanpa history jika payload terlalu besar
        reply = await sendToAI([
          { role: "system", content: systemPrompt },
          { role: "user", content: inputText },
        ]);
      } catch (retryErr) {
        const msg = retryErr.isRateLimit 
          ? "⏳ Rate limit. Coba lagi sebentar." 
          : "❌ Terjadi error saat menghubungi AI.";
        return ctx.reply(msg).catch(() => {});
      }
    } else {
      console.error("[AI] Unexpected error:", err);
      return ctx.reply("❌ Terjadi error tidak terduga.").catch(() => {});
    }
  }
  
  if (!reply) return;

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
• Support multi\\-provider: Groq & OpenRouter
• History terpisah: private \\(per user\\) & group \\(per chat\\)
• History tersimpan di KV \\(max 10 pasang pesan\\)
• Auto\\-trim history kalau terlalu panjang
• Support reply pesan bot
• Auto split pesan panjang`;
}

/* ================= EXPORT BOT HANDLER ================= */
export default (bot) => {
  bot.command("ai", async (ctx) => {
    const text = ctx.message?.text?.trim() || "";
    const input = text.replace(/^\/ai(@\w+)?\s*/i, "").trim();

    if (!input || input.toLowerCase() === "help") {
      return ctx.reply(getHelpMessage(), { parse_mode: "MarkdownV2" });
    }

    await handleAICore(ctx, input);
  });

  bot.on("message:text", async (ctx) => {
    const text = ctx.message?.text?.trim() || "";
    if (!text || text.startsWith("/")) return;
    
    if (ctx.message?.reply_to_message?.from?.id === ctx.me.id) {
      await handleAICore(ctx, text);
    }
  });
};
