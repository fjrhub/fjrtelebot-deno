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
          "• <code>/setver nextplayer@update</code>",
        { parse_mode: "HTML" }
      );
    }

    const [repoName, inputVer] = args.split("@");

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

    // ✅ Jika pakai @update → ambil latest release
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

    const userId = ctx.from?.id ?? ctx.chat.id;

    const kvKey = ["gh_ver", userId, owner, repoSlug];

    await kv.set(kvKey, finalVersion);

    ctx.reply(
      `✅ Versi <b>${repo.name}</b> berhasil di-set ke <code>${finalVersion}</code>`,
      { parse_mode: "HTML" }
    );
  });
};