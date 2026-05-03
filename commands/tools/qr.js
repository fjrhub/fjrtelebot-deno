import QRCode from "npm:qrcode";
import { InputFile } from "npm:grammy";

export default (bot) => {
  bot.command("qr", async (ctx) => {
    try {
      const text = ctx.match?.trim();

      if (!text) {
        return ctx.reply("Contoh:\n/qr Halo Dunia");
      }

      const buffer = await QRCode.toBuffer(text, {
        width: 500,
        margin: 2,
      });

      await ctx.replyWithPhoto(
        new InputFile(buffer, "qrcode.png"),
        {
          caption: `QR Code untuk:\n${text}`,
        }
      );

    } catch (err) {
      console.error(err);
      await ctx.reply("Gagal membuat QR Code.");
    }
  });
};