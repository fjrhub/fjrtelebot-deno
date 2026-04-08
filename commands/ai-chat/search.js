export default (bot) => {
  bot.command("search", async (ctx) => {
    try {
      const text = ctx.match;

      if (!text) {
        return ctx.reply(
          "Masukkan pertanyaan!\nContoh: /search harga POCO X8 Pro"
        );
      }

      // Encode biar aman di URL
      const query = encodeURIComponent(text);

      const res = await fetch(
        `https://api.siputzx.my.id/api/ai/duckai?model=gpt-4o-mini&message=${query}`
      );

      const data = await res.json();

      const result = data?.data?.message || "Tidak ada hasil";

      await ctx.reply(result, {
        parse_mode: "Markdown"
      });

    } catch (err) {
      console.error(err);
      await ctx.reply("Terjadi error saat mengambil data ❌");
    }
  });
};