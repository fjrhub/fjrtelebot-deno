import { kv } from "../../kv.js";
import { repos, parseGithubUrl } from "../../config/config-repos.js";

export default (bot) => {
  bot.command("setver", async (ctx) => {
    const args = (ctx.message?.text || "").split(" ").slice(1).join(" ").trim();

    if (!args.includes("@")) {
      return ctx.reply(
        "📝 <b>Format:</b> <code>/setver namaRepo@versi</code>\n" +
        "💡 <b>Contoh:</b> <code>/setver nextplayer@v2.1.0</code>",
        { parse_mode: "HTML" }
      );
    }

    const [repoName, newVer] = args.split("@");
    const userId = ctx.from?.id ?? ctx.chat.id;

    const repo = repos.find(r => r.name.toLowerCase() === repoName.toLowerCase());
    if (!repo) {
      const list = repos.map(r => r.name).join(", ");
      return ctx.reply(
        `❌ Repo "<code>${repoName}</code>" tidak ditemukan.\n` +
        `📦 Tersedia: ${list}`,
        { parse_mode: "HTML" }
      );
    }

    const { owner, repo: repoSlug } = parseGithubUrl(repo.url);
    const kvKey = ["gh_ver", userId, owner, repoSlug];

    await kv.set(kvKey, newVer);
    
    ctx.reply(
      `✅ Versi <b>${repo.name}</b> berhasil di-set ke <code>${newVer}</code>`,
      { parse_mode: "HTML" }
    );
  });
};