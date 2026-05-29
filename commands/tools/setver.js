import { kv } from "../../kv.js";
import { repos, parseGithubUrl } from "../../config/config-repos.js";

const USER_AGENT = "Telegram-Bot/1.0";
const FETCH_TIMEOUT = 10000;

const fetchLatestRelease = async (owner, repo) => {
  try {
    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      FETCH_TIMEOUT
    );

    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
      {
        signal: controller.signal,
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": USER_AGENT,
        },
      }
    );

    clearTimeout(timeout);

    if (!res.ok) {
      return null;
    }

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

    const atIndex = args.indexOf("@");

    if (atIndex === -1) {
      return ctx.reply(
        "📝 <b>Format:</b> <code>/setver namaRepo@versi</code>\n" +
          "💡 <b>Contoh:</b>\n" +
          "• <code>/setver nextplayer@v2.1.0</code>\n" +
          "• <code>/setver nextplayer@update</code>\n" +
          "• <code>/setver all@update</code>",
        { parse_mode: "HTML" }
      );
    }

    const repoName = args.slice(0, atIndex).trim();
    const inputVer = args.slice(atIndex + 1).trim();

    if (!repoName || !inputVer) {
      return ctx.reply(
        "❌ Format tidak valid.\n\n" +
          "Contoh:\n" +
          "<code>/setver nextplayer@v2.1.0</code>",
        { parse_mode: "HTML" }
      );
    }

    const userId = ctx.from?.id ?? ctx.chat.id;

    // =========================================================
    // BULK UPDATE
    // =========================================================
    if (
      repoName.toLowerCase() === "all" &&
      inputVer.toLowerCase() === "update"
    ) {
      const results = await Promise.all(
        repos.map(async (r) => {
          const { owner, repo } = parseGithubUrl(r.url);

          const latest = await fetchLatestRelease(owner, repo);

          if (!latest) {
            return `❌ <b>${r.name}</b> → Failed`;
          }

          const kvKey = ["gh_ver", userId, owner, repo];

          await kv.set(kvKey, latest);

          return `✅ <b>${r.name}</b> → <code>${latest}</code>`;
        })
      );

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
    // CARI REPO
    // =========================================================
    const repo = repos.find(
      (r) => r.name.toLowerCase() === repoName.toLowerCase()
    );

    if (!repo) {
      return ctx.reply(
        `❌ Repo "<code>${repoName}</code>" tidak ditemukan.\n\n` +
          `📦 Tersedia:\n${repos.map((r) => r.name).join(", ")}`,
        {
          parse_mode: "HTML",
        }
      );
    }

    const { owner, repo: repoSlug } = parseGithubUrl(repo.url);

    let finalVersion = inputVer;

    // =========================================================
    // AUTO UPDATE SINGLE REPO
    // =========================================================
    if (inputVer.toLowerCase() === "update") {
      const latest = await fetchLatestRelease(owner, repoSlug);

      if (!latest) {
        return ctx.reply(
          `❌ Gagal mengambil versi terbaru dari <b>${repo.name}</b>`,
          {
            parse_mode: "HTML",
          }
        );
      }

      finalVersion = latest;
    }

    const kvKey = ["gh_ver", userId, owner, repoSlug];

    await kv.set(kvKey, finalVersion);

    return ctx.reply(
      `✅ Versi <b>${repo.name}</b> berhasil di-set ke <code>${finalVersion}</code>`,
      {
        parse_mode: "HTML",
      }
    );
  });
};