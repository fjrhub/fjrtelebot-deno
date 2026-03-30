import { kv } from "../../kv.js";

/* ================= HISTORY KEY RESOLVER ================= */
function getHistoryKey(ctx) {
  if (ctx.chat.type === "private") {
    return ["history", "user", ctx.from.id];
  }
  return ["history", "group", ctx.chat.id];
}

function escapeMarkdownV2(text) {
  if (typeof text !== "string") return text;
  return text.replace(/([\\_*[\]()~`>#+=\|{}.!-])/g, "\\$1");
}

export default (bot) => {
  bot.command("history", async (ctx) => {
    const key = getHistoryKey(ctx);
    const res = await kv.get(key);
    const history = res.value || [];
    
    if (history.length === 0) {
      return ctx.reply("📭 Belum ada history chat\\.", {
        parse_mode: "MarkdownV2",
      });
    }
    
    // Format history ke JSON string
    const formatted = history.map((msg, i) => {
      const role = msg.role === "ai" ? "assistant" : msg.role;
      return `[${i + 1}] [${role.toUpperCase()}]\\: ${msg.content}`;
    }).join("\n\n");
    
    // Kirim sebagai file JSON kalau terlalu panjang
    if (formatted.length > 3000) {
      const jsonContent = JSON.stringify(history, null, 2);
      const buffer = new TextEncoder().encode(jsonContent);
      
      await ctx.replyWithDocument({
        source: buffer,
        filename: `history_${ctx.chat.id}_${Date.now()}.json`,
      }, {
        caption: `📦 History chat \\(${history.length} pesan\\)`,
        parse_mode: "MarkdownV2",
      });
      return;
    }
    
    // Kirim sebagai text kalau masih muat
    const caption = `*📜 History Chat* \\(${history.length} pesan\\)\n\n${escapeMarkdownV2(formatted)}`;
    await ctx.reply(caption, {
      parse_mode: "MarkdownV2",
      disable_web_page_preview: true,
    });
  });
};