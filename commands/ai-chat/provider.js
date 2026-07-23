import { kv } from "../../kv.js";

const PROVIDERS = [
  "groq",
  "openrouter",
];

const DEFAULT_PROVIDER = "groq";

// Escape khusus untuk MarkdownV2 di dalam code block (hanya ` dan \ yang perlu di-escape)
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
      
      const escapedSelected = escapeCode(selected);
      await ctx.reply(`✅ Provider berhasil diubah ke:\n\`${escapedSelected}\``, {
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