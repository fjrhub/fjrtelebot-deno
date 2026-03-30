import { kv } from "../../kv.js";

/* ================= HISTORY KEY RESOLVER ================= */
function getHistoryKey(ctx) {
  if (ctx.chat.type === "private") {
    return ["history", "user", ctx.from.id];
  }
  return ["history", "group", ctx.chat.id];
}

export default (bot) => {
  bot.command("reset", async (ctx) => {
    const key = getHistoryKey(ctx);
    
    // Confirm before delete (optional, bisa di-comment kalau mau langsung reset)
    await kv.delete(key);
    
    const chatType = ctx.chat.type === "private" ? "private" : "grup";
    await ctx.reply(`✅ History chat ${chatType} telah direset\\.`, {
      parse_mode: "MarkdownV2",
    });
  });
};