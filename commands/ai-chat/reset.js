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
    const text = ctx.message?.text?.trim();
    const args = text.replace(/^\/reset(@\w+)?\s*/i, "").trim();
    
    // Cek apakah argumen adalah "-all"
    if (args === "-all") {
      try {
        let count = 0;
        // List semua key dengan prefix ["history"]
        const entries = kv.list({ prefix: ["history"] });
        for await (const entry of entries) {
          await kv.delete(entry.key);
          count++;
        }
        
        await ctx.reply(`✅ Semua history chat telah direset (${count} data dihapus)\\.`, {
          parse_mode: "MarkdownV2",
        });
      } catch (err) {
        console.error("[reset-all] Error:", err.message);
        await ctx.reply("❌ Gagal reset semua history\\.", {
          parse_mode: "MarkdownV2",
        });
      }
    } else {
      // Reset history chat saat ini saja
      const key = getHistoryKey(ctx);
      await kv.delete(key);
      
      const chatType = ctx.chat.type === "private" ? "private" : "grup";
      await ctx.reply(`✅ History chat ${chatType} telah direset\\.`, {
        parse_mode: "MarkdownV2",
      });
    }
  });
};