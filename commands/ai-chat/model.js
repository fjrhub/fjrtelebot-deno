import { kv } from "../../kv.js";

export const PROVIDER_MODELS = {
  groq: [
    "qwen/qwen3.6-27b",
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b"
  ],
  openrouter: [
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "poolside/laguna-m.1:free",
    "cohere/north-mini-code:free",
    "openai/gpt-oss-20b:free"
  ]
};

export const DEFAULT_MODELS = {
  groq: "qwen/qwen3.6-27b",
  openrouter: "nvidia/nemotron-3-ultra-550b-a55b:free"
};

// Escape SEMUA karakter khusus MarkdownV2 untuk teks biasa
function escapeMarkdownV2(text) {
  if (typeof text !== "string") return text;
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

// Escape khusus untuk di dalam code block (hanya ` dan \)
function escapeCode(text) {
  if (typeof text !== "string") return text;
  return text.replace(/([`\\])/g, "\\$1");
}

export default (bot) => {
  bot.command("model", async (ctx) => {
    try {
      const text = ctx.message?.text || "";
      const args = text.replace(/^\/model(@\w+)?\s*/i, "").trim();

      const providerRes = await kv.get(["ai_provider"], { cached: false });
      const currentProvider = providerRes?.value || "groq";
      
      const availableModels = PROVIDER_MODELS[currentProvider] || PROVIDER_MODELS.groq;
      const defaultModel = DEFAULT_MODELS[currentProvider] || DEFAULT_MODELS.groq;

      if (!args) {
        const res = await kv.get(["ai_model"], { cached: false });
        let current = res?.value;
        
        if (!current || !availableModels.includes(current)) {
          current = defaultModel;
          await kv.set(["ai_model"], current);
        }
        
        const list = availableModels.map((m, i) => {
          const escapedModel = escapeCode(m);
          const mark = m === current ? " ✅" : "";
          return `${i + 1}\\.` + ` \`${escapedModel}\`${mark}`;
        }).join("\n");
        
        const escapedProvider = escapeMarkdownV2(currentProvider);
        const helpText = 
          `*🤖 Daftar Model Tersedia \\(${escapedProvider}\\)*\n\n` +
          list + "\n\n" +
          "*Gunakan:* `/model nama_model`\n" +
          "*Contoh:* `/model " + escapeCode(availableModels[0]) + "`";
        
        return ctx.reply(helpText, { 
          parse_mode: "MarkdownV2", 
          disable_web_page_preview: true 
        });
      }

      const selected = availableModels.find((m) => m.toLowerCase() === args.toLowerCase());
      if (!selected) {
        return ctx.reply(`❌ Model tidak ditemukan atau tidak tersedia untuk provider \`${escapeCode(currentProvider)}\`. Gunakan \`/model\` untuk lihat daftar\\.`, {
          parse_mode: "MarkdownV2"
        });
      }

      await kv.set(["ai_model"], selected);
      
      const escapedSelected = escapeCode(selected);
      await ctx.reply(`✅ Model berhasil diubah ke:\n\`${escapedSelected}\``, {
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      });
    } catch (error) {
      console.error("Error in /model command:", error);
      await ctx.reply("❌ Terjadi kesalahan saat memproses perintah\\.", {
        parse_mode: "MarkdownV2"
      });
    }
  });
};