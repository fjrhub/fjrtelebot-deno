import { InputFile } from "npm:grammy";

export default (bot) => {
  bot.command("img", async (ctx) => {
    try {
      const text = ctx.message.text.trim();
      const args = text.split(" ").slice(1);

      if (!args.length) {
        return ctx.reply("Contoh:\n/img https://linkgambar.png");
      }

      const url = args[0];

      try {
        new URL(url);
      } catch {
        return ctx.reply("URL tidak valid.");
      }

      await ctx.reply("Mengunduh gambar...");

      const res = await fetch(url);

      if (!res.ok) {
        return ctx.reply("Gagal download gambar.");
      }

      const bytes = new Uint8Array(await res.arrayBuffer());

      await ctx.replyWithPhoto(
        new InputFile(bytes, "image.png"),
        {
          caption: "Berhasil dikirim ✅"
        }
      );

    } catch (err) {
      console.error(err);
      await ctx.reply("Terjadi error.");
    }
  });
};