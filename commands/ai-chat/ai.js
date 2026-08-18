import { sendToAI } from "../../config/ai_services.js";
import { kv } from "../../kv.js";

/* ================= HISTORY & STATE KEY RESOLVER ================= */
function getHistoryKey(ctx) {
  if (ctx.chat.type === "private") return ["history", "user", ctx.from.id];
  return ["history", "group", ctx.chat.id];
}

function getAiMsgKey(ctx) {
  if (ctx.chat.type === "private") return ["last_ai_msgs", "user", ctx.from.id];
  return ["last_ai_msgs", "group", ctx.chat.id];
}

async function getHistory(ctx) {
  const key = getHistoryKey(ctx);
  const res = await kv.get(key, { consistency: "eventual" });
  return res.value || [];
}

async function saveHistory(ctx, messages) {
  const key = getHistoryKey(ctx);
  await kv.set(key, messages.slice(-20));
}

/* ================= HISTORY TRIM (O(N) Optimization) ================= */
function trimHistorySafe(history, maxChars = 4500) {
  let chars = 0;
  let startIndex = history.length;
  
  for (let i = history.length - 1; i >= 0; i--) {
    chars += (history[i].content?.length || 0);
    if (chars > maxChars) {
      startIndex = i + 1;
      break;
    }
    if (i === 0) startIndex = 0;
  }
  
  return history.slice(startIndex);
}

/* ================= MESSAGE FORMATTER ================= */
function splitMessage(text, limit = 4000) {
  const chunks = [];
  let remaining = text;
  
  while (remaining.length > limit) {
    let idx = remaining.lastIndexOf("\n\n", limit);
    if (idx < limit * 0.4) idx = remaining.lastIndexOf("\n", limit);
    if (idx < limit * 0.4) idx = remaining.lastIndexOf(" ", limit);
    if (idx < limit * 0.4) idx = limit;

    chunks.push(remaining.slice(0, idx).trim());
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
      segments.push("**" + escapeMarkdownV2(b1 || b2) + "**");
    } else if (i1 || i2) {
      segments.push("*" + escapeMarkdownV2(i1 || i2) + "*");
    } else if (lt && url) {
      const safeUrl = url.replace(/[()]/g, "\\$&");
      segments.push(`[${escapeMarkdownV2(lt)}](${safeUrl})`);
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
  let lastMsgId = null;
  
  for (const chunk of chunks) {
    let converted = null;
    try {
      converted = convertToMarkdownV2(chunk);
    } catch (e) {
      console.warn("Markdown conversion failed, falling back to plain text:", e.message);
    }

    let sent = false;
    if (converted) {
      try {
        const msg = await ctx.reply(converted, {
          parse_mode: "MarkdownV2",
          link_preview_options: { is_disabled: true },
        });
        lastMsgId = msg.message_id;
        sent = true;
      } catch (e) {
        console.error("MarkdownV2 send error:", e.description || e.message);
      }
    }
    
    if (!sent) {
      try {
        const msg = await ctx.reply(chunk, {
          link_preview_options: { is_disabled: true },
        });
        lastMsgId = msg.message_id;
      } catch (e) {
        console.error("Plain text send error:", e.description || e.message);
      }
    }
  }
  return lastMsgId;
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
- JANGAN tampilkan <thought> atau proses berpikir
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
  try {
    await ctx.replyWithChatAction("typing");
  } catch (e) {
    // Ignore jika gagal mengirim chat action
  }

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

  const processAIResponse = async () => {
    let reply;
    try {
      reply = await sendToAI(messages);
    } catch (err) {
      if (err.isRateLimit) {
        await ctx.reply("⏳ Rate limit. Coba lagi sebentar.").catch(() => {});
        return;
      }
      if (err.isTooLarge) {
        try {
          reply = await sendToAI([
            { role: "system", content: systemPrompt },
            { role: "user", content: inputText },
          ]);
        } catch (retryErr) {
          const msg = retryErr.isRateLimit 
            ? "⏳ Rate limit. Coba lagi sebentar." 
            : "❌ Terjadi error saat menghubungi AI.";
          await ctx.reply(msg).catch(() => {});
          return;
        }
      } else {
        console.error("[AI] Unexpected error:", err);
        await ctx.reply("❌ Terjadi error tidak terduga.").catch(() => {});
        return;
      }
    }
    
    if (!reply) return;

    await saveHistory(ctx, [
      ...history,
      { role: "user", content: inputText },
      { role: "ai", content: reply },
    ]);
    
    const lastMsgId = await sendMarkdownMessage(ctx, reply);
    
    if (lastMsgId) {
      const key = getAiMsgKey(ctx);
      const res = await kv.get(key, { consistency: "eventual" });
      const recentMsgs = Array.isArray(res.value) ? res.value : [];
      
      recentMsgs.push(lastMsgId);
      if (recentMsgs.length > 3) recentMsgs.shift(); 
      
      await kv.set(key, recentMsgs);
    }
  };
  
  try {
    await processAIResponse();
  } catch (err) {
    console.error("[AI] Uncaught error in handler:", err);
    await ctx.reply("❌ Terjadi error tidak terduga.").catch(() => {});
  }
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
• Support reply pesan bot *\\(hanya jika membalas output AI\\)*
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
      const key = getAiMsgKey(ctx);
      
      const t0 = performance.now();
      const res = await kv.get(key, { consistency: "eventual" });
      const t1 = performance.now();
      const kvReadTime = (t1 - t0).toFixed(2);
      
      const recentMsgs = Array.isArray(res.value) ? res.value : [];
      
      if (recentMsgs.includes(ctx.message.reply_to_message.message_id)) {
        await handleAICore(ctx, text);
        
        await ctx.reply(`⚡ KV Read Speed: ${kvReadTime} ms`, {
          reply_to_message_id: ctx.message.message_id,
        }).catch(() => {});
      }
    }
  });
};