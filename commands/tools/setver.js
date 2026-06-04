import { kv } from "../../kv.js";
import { repos, parseGithubUrl } from "../../config/config-repos.js";

const USER_AGENT = "Telegram-Bot/1.0";
const FETCH_TIMEOUT = 10000;

/**
 * Fetches the latest release tag from a GitHub repository.
 */
const fetchLatestRelease = async (owner, repo) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
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

    if (!res.ok) return null;

    const data = await res.json();
    return data.tag_name || null;
  } catch {
    return null;
  } finally {
    // Pastikan timeout selalu dibersihkan untuk mencegah memory leak
    clearTimeout(timeoutId);
  }
};

/**
 * Handles bulk update for all configured repositories.
 */
const handleBulkUpdate = async (ctx, userId) => {
  const results = await Promise.all(
    repos.map(async (r) => {
      try {
        const { owner, repo } = parseGithubUrl(r.url);
        const latest = await fetchLatestRelease(owner, repo);

        if (!latest) {
          return { name: r.name, success: false, version: null };
        }

        await kv.set(["gh_ver", userId, owner, repo], latest);
        return { name: r.name, success: true, version: latest };
      } catch {
        // Tangani error per repo agar tidak menghentikan proses bulk secara keseluruhan
        return { name: r.name, success: false, version: null };
      }
    })
  );

  const formattedResults = results.map((res) =>
    res.success
      ? `✅ <b>${res.name}</b> → <code>${res.version}</code>`
      : `❌ <b>${res.name}</b> → Failed`
  );

  return ctx.reply(
    "🚀 <b>Bulk update completed</b>\n\n" + formattedResults.join("\n"),
    { parse_mode: "HTML", disable_web_page_preview: true }
  );
};

/**
 * Handles single repository update.
 */
const handleSingleUpdate = async (ctx, userId, repoName, inputVer) => {
  const repo = repos.find(
    (r) => r.name.toLowerCase() === repoName.toLowerCase()
  );

  if (!repo) {
    return ctx.reply(
      `❌ Repo "<code>${repoName}</code>" tidak ditemukan.\n\n` +
        `📦 Tersedia:\n${repos.map((r) => `<code>${r.name}</code>`).join(", ")}`,
      { parse_mode: "HTML" }
    );
  }

  const { owner, repo: repoSlug } = parseGithubUrl(repo.url);
  let finalVersion = inputVer;

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

  await kv.set(["gh_ver", userId, owner, repoSlug], finalVersion);

  return ctx.reply(
    `✅ Versi <b>${repo.name}</b> berhasil di-set ke <code>${finalVersion}</code>`,
    { parse_mode: "HTML" }
  );
};

export default (bot) => {
  bot.command("setver", async (ctx) => {
    // TODO: Tambahkan pengecekan otorisasi di sini (misal: hanya Superadmin/Admin)
    // if (!isAuthorized(ctx.from.id)) return ctx.reply("❌ Unauthorized");

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

    const atIndex = args.indexOf("@");
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

    if (repoName.toLowerCase() === "all" && inputVer.toLowerCase() === "update") {
      return handleBulkUpdate(ctx, userId);
    }

    return handleSingleUpdate(ctx, userId, repoName, inputVer);
  });
};
