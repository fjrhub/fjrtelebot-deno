import { kv } from "../../kv.js";

const MODELS = [
  "qwen/qwen3-32b",
  "groq/compound",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-120b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
];

// 🔐 Escape semua special char MarkdownV2 Telegram
function escapeMarkdownV2(text) {
  if (typeof text !== "string") return text;
  // Reserved chars: \ _ * [ ] ( ) ~ ` > # + - = | { } . !
  return text.replace(/([\\_*[\]()~`>#+=\|{}.!-])/g, "\\$1");
}

export default (bot) => {
  bot.command("model", async (ctx) => {
    const text = ctx.message?.text?.trim();
    const args = text.replace(/^\/model(@\w+)?\s*/i, "").trim();

    if (!args) {
      const current = (await kv.get(["ai_model"])).value || "openai/gpt-oss-120b";
      
      // ✅ Build list dengan escaping yang benar
      const list = MODELS.map((m, i) => {
        const escapedModel = escapeMarkdownV2(m);
        const mark = m === current ? " ✅" : "";
        return `${i + 1}\\.` + ` \`${escapedModel}\`${mark}`;
      }).join("\n");
      
      // ✅ Hindari < >, pakai backtick untuk placeholder
      const helpText = 
        "*🤖 Daftar Model Tersedia*\n\n" +
        list + "\n\n" +
        "*Gunakan:* `/model nama_model`\n" +
        "*Contoh:* `/qwen/qwen3-32b`";
      
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
    const escapedSelected = escapeMarkdownV2(selected);
    await ctx.reply(`✅ Model berhasil diubah ke:\n\`${escapedSelected}\``, {
      parse_mode: "MarkdownV2",
      disable_web_page_preview: true,
    });
  });
};