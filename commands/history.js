import { kv } from "../kv.js";
import { InputFile } from "npm:grammy";

export default (bot) => {
  bot.command("history", async (ctx) => {
    const userId = ctx.from.id;

    const res = await kv.get(["history", userId]);
    const history = res.value || [];

    if (history.length === 0) {
      return ctx.reply("Belum ada history");
    }

    // convert ke JSON string (rapi)
    const json = JSON.stringify(history, null, 2);

    const file = new InputFile(
      new TextEncoder().encode(json),
      `history_${userId}.json`
    );

    await ctx.replyWithDocument(file);
  });
};