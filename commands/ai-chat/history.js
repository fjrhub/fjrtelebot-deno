import { kv } from "../../kv.js";
import { InputFile } from "npm:grammy";

/* ================= HISTORY KEY RESOLVER ================= */
function getHistoryKey(ctx) {
  if (ctx.chat.type === "private") {
    return ["history", "user", ctx.from.id];
  }
  return ["history", "group", ctx.chat.id];
}

/* ================= FILENAME GENERATOR ================= */
function generateFilename(ctx) {
  const chatType = ctx.chat.type === "private" ? "private" : "group";
  const chatId = ctx.chat.id.toString().replace("-", "");
  const username = ctx.from?.username || ctx.from?.first_name || "user";
  const date = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  
  return `fjrbot_history_${chatType}_${username}_${chatId}_${date}.json`;
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
    
    // Kirim sebagai file JSON pakai InputFile
    await ctx.replyWithDocument(
      InputFile.fromBuffer(buffer, generateFilename(ctx)),
      {
        caption: `📦 History chat \\(${history.length} pesan\\)`,
        parse_mode: "MarkdownV2",
      }
    );
  });
};