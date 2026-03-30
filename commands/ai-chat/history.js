import { InputFile } from "npm:grammy";
import { kv } from "../../kv.js";

export default (bot) => {
  bot.command("history", async (ctx) => {
    const userId = ctx.from.id;
    const res = await kv.get(["history", userId]);
    const history = res.value || [];
    
    if (!history.length) return ctx.reply("History kosong.");

    const data = {
      exportedAt: new Date().toISOString(),
      userId,
      messageCount: history.length,
      messages: history.map((m) => ({
        role: m.role === "ai" ? "assistant" : m.role,
        content: m.content,
      })),
    };
    const buf = new TextEncoder().encode(JSON.stringify(data, null, 2));

    return ctx.replyWithDocument(
      new InputFile(buf, `ai-history-${userId}-${Date.now()}.json`),
      { caption: `📦 *Export History*\n• ${history.length} pesan`, parse_mode: "Markdown" },
    );
  });
};