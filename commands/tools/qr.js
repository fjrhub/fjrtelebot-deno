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
          "📝 Usage example:\n<code>/qr Hello World</code>",
          {
            parse_mode: "HTML",
          }
        );
      }

      if (text.length > MAX_TEXT_LENGTH) {
        return ctx.reply(
          `❌ Text is too long.\nMaximum ${MAX_TEXT_LENGTH} characters allowed.`
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
              ? "✅ QR Code generated successfully."
              : `✅ QR Code for:\n${text}`,
        }
      );
    } catch (error) {
      console.error("[QR]", error);

      await ctx.reply(
        "❌ An error occurred while generating the QR Code."
      );
    }
  });
};
