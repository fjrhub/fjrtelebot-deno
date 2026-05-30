import QRCode from "npm:qrcode";
import { InputFile } from "npm:grammy";

const QR_SIZE = 500;
const QR_MARGIN = 2;
const MAX_TEXT_LENGTH = 2000;

export default (bot) => {
  bot.command("qr", async (ctx) => {
    try {
      const text = ctx.match?.trim();

      if (!text) {
        return ctx.reply(
          "📝 Contoh penggunaan:\n<code>/qr Halo Dunia</code>",
          {
            parse_mode: "HTML",
          }
        );
      }

      if (text.length > MAX_TEXT_LENGTH) {
        return ctx.reply(
          `❌ Teks terlalu panjang.\nMaksimal ${MAX_TEXT_LENGTH} karakter.`
        );
      }

      const buffer = await QRCode.toBuffer(text, {
        width: QR_SIZE,
        margin: QR_MARGIN,
        errorCorrectionLevel: "M",
      });

      await ctx.replyWithPhoto(
        new InputFile(buffer, "qrcode.png"),
        {
          caption:
            text.length > 500
              ? "✅ QR Code berhasil dibuat."
              : `✅ QR Code untuk:\n${text}`,
        }
      );
    } catch (error) {
      console.error("[QR]", error);

      await ctx.reply(
        "❌ Terjadi kesalahan saat membuat QR Code."
      );
    }
  });
};