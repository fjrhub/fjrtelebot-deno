import { kv } from "../../kv.js";

/* ================= OWNER CHECK ================= */
function isOwner(userId) {
  const ownerId = Deno.env.get("OWNER_ID");
  if (!ownerId) return false;
  return userId === parseInt(ownerId);
}

export default (bot) => {
  bot.command("resetall", async (ctx) => {
    if (!isOwner(ctx.from.id)) {
      return ctx.reply("❌ Command ini hanya untuk owner\\.", {
        parse_mode: "MarkdownV2",
      });
    }

    const args = ctx.message?.text?.trim().split(/\s+/).slice(1) || [];
    if (!args.includes("--force")) {
      return ctx.reply(
        "⚠️ Perintah ini akan menghapus *semua* history chat di database\\.\n" +
        "Gunakan `/resetall --force` untuk konfirmasi\\.",
        { parse_mode: "MarkdownV2" }
      );
    }

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