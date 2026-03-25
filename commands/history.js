import { kv } from "../kv.js";

export default (bot) => {
  bot.command("history", async (ctx) => {
    const userId = ctx.from.id;

    const res = await kv.get(["history", userId]);
    const history = res.value || [];

    if (history.length === 0) {
      return ctx.reply("Belum ada history");
    }

    const text = history
      .map((h) => `${h.role}: ${h.content}`)
      .join("\n");

    await ctx.reply(text);
  });
};