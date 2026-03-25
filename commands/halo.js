import { kv } from "../kv.js";

export default (bot) => {
  bot.command("halo", async (ctx) => {
    const userId = ctx.from.id;

    // ambil history lama
    const res = await kv.get(["history", userId]);
    const history = res.value || [];

    // pesan user
    const userMessage = "halo";

    // fake AI response (sementara)
    const aiResponse = "Halo juga! (ini dari AI 🤖)";

    // simpan ke history
    history.push(
      { role: "user", content: userMessage },
      { role: "ai", content: aiResponse }
    );

    // simpan ke KV
    await kv.set(["history", userId], history);

    // kirim response
    await ctx.reply(aiResponse);
  });
};