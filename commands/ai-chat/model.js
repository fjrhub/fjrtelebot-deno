import { kv } from "../../kv.js";

const MODELS = [
  "qwen/qwen3-32b",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-120b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "nvidia/nemotron-3-super-120b-a12b:free",
];

const DEFAULT_MODEL = "qwen/qwen3-32b";

// Escape khusus untuk MarkdownV2 di dalam code block (hanya ` dan \ yang perlu di-escape)
function escapeCode(text) {
  if (typeof text !== "string") return text;
  return text.replace(/([`\\])/g, "\\$1");
}

export default (bot) => {
  bot.command("model", async (ctx) => {
    try {
      const text = ctx.message?.text || "";
      const args = text.replace(/^\/model(@\w+)?\s*/i, "").trim();

      if (!args) {
        const res = await kv.get(["ai_model"], { cached: false });
        const current = res?.value || DEFAULT_MODEL;
        
        const list = MODELS.map((m, i) => {
          const escapedModel = escapeCode(m);
          const mark = m === current ? " ✅" : "";
          return `${i + 1}\\.` + ` \`${escapedModel}\`${mark}`;
        }).join("\n");
        
        const helpText = 
          "*🤖 Daftar Model Tersedia*\n\n" +
          list + "\n\n" +
          "*Gunakan:* `/model nama_model`\n" +
          "*Contoh:* `/model qwen/qwen3-32b`";
        
        return ctx.reply(helpText, { 
          parse_mode: "MarkdownV2", 
          disable_web_page_preview: true 
        });
      }

      const selected = MODELS.find((m) => m.toLowerCase() === args.toLowerCase());
      if (!selected) {
        return ctx.reply("❌ Model tidak ditemukan\\. Gunakan `/model` untuk lihat daftar\\.", {
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
