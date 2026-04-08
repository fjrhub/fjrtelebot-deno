export default (bot) => {
  bot.command("search", async (ctx) => {
    const text = ctx.match?.trim();

    if (!text) {
      return ctx.reply("Masukkan pertanyaan!");
    }

    // ⚡ respon cepat biar webhook gak timeout
    await ctx.reply("⏳ Sedang diproses...");

    // 🚀 jalankan async tanpa blocking webhook
    handleAI(ctx, text);
  });
};

// fungsi terpisah (background)
async function handleAI(ctx, text) {
  try {
    const query = encodeURIComponent(text);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // max 15 detik

    const res = await fetch(
      `https://api.siputzx.my.id/api/ai/duckai?model=gpt-4o-mini&message=${query}`,
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    if (!res.ok) throw new Error("API error");

    const data = await res.json();
    const result = data?.data?.message || "Tidak ada hasil";

    await ctx.reply(result, {
      parse_mode: "Markdown"
    });

  } catch (err) {
    console.error(err);
    await ctx.reply("❌ Gagal mengambil data (timeout / API error)");
  }
}