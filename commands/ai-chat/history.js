import { kv } from "../../kv.js";
import { InputFile } from "npm:grammy";

/* ================= HISTORY KEY RESOLVER ================= */
function getHistoryKey(ctx) {
  if (ctx.chat.type === "private") {
    return ["history", "user", ctx.from.id];
  }
  return ["history", "group", ctx.chat.id];
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
    
    // Format ke JSON
    const jsonContent = JSON.stringify(history, null, 2);
    const buffer = new TextEncoder().encode(jsonContent);
    
    // ✅ Gunakan constructor InputFile(buffer, filename)
    const file = new InputFile(buffer, "history.json");
    
    await ctx.replyWithDocument(file, {
      caption: `📦 History chat \\(${history.length} pesan\\)`,
      parse_mode: "MarkdownV2",
    });
  });
};