import { kv } from "../../kv.js";
import { repos, parseGithubUrl } from "../../config/config-repos.js";

const fetchLatestRelease = async (owner, repo) => {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "Telegram-Bot/1.0",
        },
      }
    );

    if (!res.ok) return null;

    const data = await res.json();

    return data.tag_name || null;
  } catch {
    return null;
  }
};

export default (bot) => {
  bot.command("setver", async (ctx) => {
    const args = (ctx.message?.text || "")
      .split(" ")
      .slice(1)
      .join(" ")
      .trim();

    if (!args.includes("@")) {
      return ctx.reply(
        "📝 <b>Format:</b> <code>/setver namaRepo@versi</code>\n" +
          "💡 <b>Contoh:</b>\n" +
          "• <code>/setver nextplayer@v2.1.0</code>\n" +
          "• <code>/setver nextplayer@update</code>\n" +
          "• <code>/setver all@update</code>",
        { parse_mode: "HTML" }
      );
    }

    const [repoName, inputVer] = args.split("@");

    const userId = ctx.from?.id ?? ctx.chat.id;

    // =========================================================
    // ✅ UPDATE SEMUA REPO
    // =========================================================
    if (
      repoName.toLowerCase() === "all" &&
      inputVer.toLowerCase() === "update"
    ) {
      const results = [];

      for (const r of repos) {
        const { owner, repo } = parseGithubUrl(r.url);

        const latest = await fetchLatestRelease(owner, repo);

        if (!latest) {
          results.push(`❌ <b>${r.name}</b> → Failed`);
          continue;
        }

        const kvKey = ["gh_ver", userId, owner, repo];

        await kv.set(kvKey, latest);

        results.push(
          `✅ <b>${r.name}</b> → <code>${latest}</code>`
        );
      }

      return ctx.reply(
        "🚀 <b>Bulk update completed</b>\n\n" +
          results.join("\n"),
        {
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }
      );
    }

    // =========================================================
    // ✅ SINGLE REPO
    // =========================================================
    const repo = repos.find(
      (r) => r.name.toLowerCase() === repoName.toLowerCase()
    );

    if (!repo) {
      const list = repos.map((r) => r.name).join(", ");

      return ctx.reply(
        `❌ Repo "<code>${repoName}</code>" tidak ditemukan.\n` +
          `📦 Tersedia: ${list}`,
        { parse_mode: "HTML" }
      );
    }

    const { owner, repo: repoSlug } = parseGithubUrl(repo.url);

    let finalVersion = inputVer;

    // =========================================================
    // ✅ AUTO UPDATE SINGLE REPO
    // =========================================================
    if (inputVer.toLowerCase() === "update") {
      const latest = await fetchLatestRelease(owner, repoSlug);

      if (!latest) {
        return ctx.reply(
          `❌ Gagal mengambil versi terbaru dari <b>${repo.name}</b>`,
          { parse_mode: "HTML" }
        );
      }

      finalVersion = latest;
    }

    const kvKey = ["gh_ver", userId, owner, repoSlug];

    await kv.set(kvKey, finalVersion);

    ctx.reply(
      `✅ Versi <b>${repo.name}</b> berhasil di-set ke <code>${finalVersion}</code>`,
      { parse_mode: "HTML" }
    );
  });
};