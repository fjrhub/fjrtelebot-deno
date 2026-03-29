import { kv } from "../../kv.js";

export default (bot) => {
  bot.command("reset", async (ctx) => {
    const userId = ctx.from.id;
    await kv.delete(["history", userId]);
    return ctx.reply("✅ History dihapus.");
  });
};