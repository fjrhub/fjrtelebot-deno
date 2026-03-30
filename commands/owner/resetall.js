import { kv } from "../../kv.js";

export default (bot) => {
  bot.command("resetall", async (ctx) => {
    // 🔐 Owner check
    const OWNERS = [123456789]; // 🔁 Ganti dengan user ID kamu
    if (!OWNERS.includes(ctx.from.id)) {
      return ctx.reply("❌ Command ini hanya untuk owner\\.", {
        parse_mode: "MarkdownV2",
      });
    }

    // ⚠️ Confirm step (opsional, bisa di-bypass dengan flag --force)
    const args = ctx.message?.text?.trim().split(/\s+/).slice(1) || [];
    if (!args.includes("--force")) {
      return ctx.reply(
        "⚠️ Perintah ini akan menghapus *semua* history chat di database\\.\n" +
        "Gunakan `/resetall --force` untuk konfirmasi\\.",
        { parse_mode: "MarkdownV2" }
      );
    }

    // 🗑️ Delete semua key dengan prefix "history"
    let count = 0;
    for await (const entry of kv.list({ prefix: ["history"] })) {
      await kv.delete(entry.key);
      count++;
    }

    await ctx.reply(`✅ Berhasil menghapus \\*${count}\\* entry history dari database\\.\n_Semua chat history telah direset_\\.\n\n💡 Tips: Gunakan \`/historyall\` dulu untuk backup sebelum reset\\.\n\n*⚠️ Action ini tidak dapat dibatalkan\\.*`, {
      parse_mode: "MarkdownV2",
    });
  });
};