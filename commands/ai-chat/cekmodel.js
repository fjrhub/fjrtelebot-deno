import { kv } from "../../kv.js";

function escapeMarkdownV2(text) {
  if (typeof text !== "string") return text;
  return text.replace(/([\\_*[\]()~`>#+=\|{}.!-])/g, "\\$1");
}

export default (bot) => {
  bot.command("cekmodel", async (ctx) => {
    const res = await kv.get(["ai_model"]);
    const current = res.value || "qwen/qwen3-32b";
    const escaped = escapeMarkdownV2(current);
    
    await ctx.reply(`*🔍 Model Aktif:*\n\`${escaped}\``, {
      parse_mode: "MarkdownV2",
      disable_web_page_preview: true,
    });
  });
};