// commands/github.js
import { kv } from "../../kv.js";
import { repos, parseGithubUrl, fetchLatestRelease } from "../../config/config-repos.js";

export default (bot) => {
  bot.command("github", async (ctx) => {
    const userId = ctx.from?.id ?? ctx.chat.id;
    const results = [];

    for (const r of repos) {
      const { owner, repo } = parseGithubUrl(r.url);
      const latest = await fetchLatestRelease(owner, repo);

      if (!latest) {
        results.push(`🔹 <b>${r.name}</b>\n❌ Gagal mengambil data atau repo private`);
        continue;
      }

      const kvKey = ["gh_ver", userId, owner, repo];
      const { value: savedVer } = await kv.get(kvKey);
      const previous = savedVer || "Belum pernah dicek";

      // ❌ HAPUS: await kv.set(kvKey, latest); 
      // ✅ /github hanya READ, tidak WRITE ke KV

      const status = previous === latest ? "✅ Sudah terbaru" : "🆕 Update tersedia!";
      results.push(
        `🔹 <b>${r.name}</b>\n` +
        `📦 Sebelumnya: <code>${previous}</code>\n` +
        `🚀 Terbaru: <code>${latest}</code> ${status}\n` +
        `🔗 <a href="${r.url}/releases/tag/${latest}">Lihat Release</a>`
      );
    }

    await ctx.reply(results.join("\n\n"), {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  });
};