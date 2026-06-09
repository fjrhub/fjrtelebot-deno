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
    try {
      const text = ctx.message?.text?.trim() || "";
      const args = text.replace(/^\/reset(@\w+)?\s*/i, "").trim().toLowerCase();
      
      console.log(`[reset] Command received from ${ctx.from.id}, args: "${args}"`);
      
      // Kirim respons awal untuk konfirmasi command diterima
      await ctx.replyWithChatAction("typing");
      
      // Cek apakah argumen adalah "-all"
      if (args === "-all") {
        console.log("[reset] Processing -all flag");
        
        let count = 0;
        const entries = kv.list({ prefix: ["history"] });
        
        for await (const entry of entries) {
          await kv.delete(entry.key);
          count++;
          console.log(`[reset] Deleted key:`, entry.key);
        }
        
        console.log(`[reset] Total deleted: ${count}`);
        
        await ctx.reply(`✅ Semua history chat telah direset (${count} data dihapus)\\.`, {
          parse_mode: "MarkdownV2",
        });
      } else {
        // Reset history chat saat ini saja
        const key = getHistoryKey(ctx);
        console.log(`[reset] Deleting key:`, key);
        
        await kv.delete(key);
        
        const chatType = ctx.chat.type === "private" ? "private" : "grup";
        await ctx.reply(`✅ History chat ${chatType} telah direset\\.`, {
          parse_mode: "MarkdownV2",
        });
      }
    } catch (err) {
      console.error("[reset] Error:", err);
      await ctx.reply("❌ Terjadi error saat reset: " + err.message).catch(() => {});
    }
  });
};