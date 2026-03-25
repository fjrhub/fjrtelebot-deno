import { kv } from "../kv.js";

export default (bot) => {
  bot.command("clearhistory", async (ctx) => {
    const userId = ctx.from.id;

    await kv.delete(["history", userId]);

    await ctx.reply("History berhasil dihapus 🗑️");
  });
};