import { kv } from "../../kv.js";
import { PROVIDER_MODELS, DEFAULT_MODELS } from "./model.js";

const PROVIDERS = ["groq", "openrouter"];
const DEFAULT_PROVIDER = "groq";

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
  bot.command("provider", async (ctx) => {
    try {
      const text = ctx.message?.text || "";
      const args = text.replace(/^\/provider(@\w+)?\s*/i, "").trim().toLowerCase();

      if (!args) {
        const res = await kv.get(["ai_provider"], { cached: false });
        const current = res?.value || DEFAULT_PROVIDER;
        
        const list = PROVIDERS.map((p, i) => {
          const escapedProvider = escapeCode(p);
          const mark = p === current ? " ✅" : "";
          return `${i + 1}\\.` + ` \`${escapedProvider}\`${mark}`;
        }).join("\n");
        
        const helpText = 
          "*⚙️ Daftar Provider AI Tersedia*\n\n" +
          list + "\n\n" +
          "*Gunakan:* `/provider nama_provider`\n" +
          "*Contoh:* `/provider openrouter`";
        
        return ctx.reply(helpText, { 
          parse_mode: "MarkdownV2", 
          disable_web_page_preview: true 
        });
      }

      const selected = PROVIDERS.find((p) => p.toLowerCase() === args);
      if (!selected) {
        return ctx.reply("❌ Provider tidak ditemukan\\. Gunakan `/provider` untuk lihat daftar\\.", {
          parse_mode: "MarkdownV2"
        });
      }

      await kv.set(["ai_provider"], selected);
      
      const modelRes = await kv.get(["ai_model"], { cached: false });
      const currentModel = modelRes?.value;
      const validModels = PROVIDER_MODELS[selected];
      
      let modelChanged = false;
      if (!currentModel || !validModels.includes(currentModel)) {
        const newDefault = DEFAULT_MODELS[selected];
        await kv.set(["ai_model"], newDefault);
        modelChanged = true;
      }
      
      const escapedSelected = escapeCode(selected);
      let replyText = `✅ Provider berhasil diubah ke:\n\`${escapedSelected}\``;
      
      if (modelChanged) {
        const newModel = DEFAULT_MODELS[selected];
        replyText += `\n\n🔄 Model otomatis disesuaikan ke:\n\`${escapeCode(newModel)}\``;
      }
      
      await ctx.reply(replyText, {
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      });
    } catch (error) {
      console.error("Error in /provider command:", error);
      await ctx.reply("❌ Terjadi kesalahan saat memproses perintah\\.", {
        parse_mode: "MarkdownV2"
      });
    }
  });
};