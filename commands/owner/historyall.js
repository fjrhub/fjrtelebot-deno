import { kv } from "../../kv.js";
import { InputFile } from "npm:grammy";

export default (bot) => {
  bot.command("historyall", async (ctx) => {
    // 🔐 Owner check (ganti ID dengan superadminmu)
    const OWNERS = [123456789]; // 🔁 Ganti dengan user ID kamu
    if (!OWNERS.includes(ctx.from.id)) {
      return ctx.reply("❌ Command ini hanya untuk owner\\.", {
        parse_mode: "MarkdownV2",
      });
    }

    // 🗄️ Ambil semua key history dari KV
    const entries = [];
    for await (const entry of kv.list({ prefix: ["history"] })) {
      entries.push({ key: entry.key, value: entry.value });
    }

    if (entries.length === 0) {
      return ctx.reply("📭 Tidak ada history di database\\.", {
        parse_mode: "MarkdownV2",
      });
    }

    // 📊 Summary
    const summary = entries.map((e) => {
      const scope = e.key[1]; // "user" or "group"
      const id = e.key[2];
      const count = Array.isArray(e.value) ? e.value.length : 0;
      return `• \`${scope}:${id}\` → ${count} pesan`;
    }).join("\n");

    const caption = `*🗄️ All History Entries* \\(${entries.length} total\\)\n\n${summary}`;

    // 📦 Kirim summary + full export as JSON
    const buffer = new TextEncoder().encode(JSON.stringify(entries, null, 2));
    const file = new InputFile(buffer, "history_all.json");

    await ctx.replyWithDocument(file, {
      caption,
      parse_mode: "MarkdownV2",
      disable_web_page_preview: true,
    });
  });
};