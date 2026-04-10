// commands/github.js
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
      },
    );

    if (!res.ok) return null;
    const data = await res.json();

    return {
      tag_name: data.tag_name,
      published_at: data.published_at,
      html_url: data.html_url,
    };
  } catch {
    return null;
  }
};

export default (bot) => {
  bot.command("github", async (ctx) => {
    const userId = ctx.from?.id ?? ctx.chat.id;
    const results = [];

    for (const r of repos) {
      const { owner, repo } = parseGithubUrl(r.url);
      const latest = await fetchLatestRelease(owner, repo);

      if (!latest) {
        results.push(
          `🔹 <b>${r.name}</b>\n❌ Failed to fetch data or repo is private`,
        );
        continue;
      }

      const kvKey = ["gh_ver", userId, owner, repo];
      const { value: savedVer } = await kv.get(kvKey);

      // ✅ Tampilkan status berdasarkan apakah sudah di-set atau belum
      let status, previousDisplay;

      if (savedVer === undefined) {
        previousDisplay = "Not set";
        status = "⚪ Not set";
      } else {
        previousDisplay = savedVer;
        status =
          savedVer === latest.tag_name
            ? "✅ Up to date"
            : "🆕 Update available!";
      }

      const publishDate = latest.published_at
        ? new Date(latest.published_at).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "-";

      results.push(
        `🔹 <b>${r.name}</b>\n` +
          `📦 Previous: <code>${previousDisplay}</code>\n` +
          `🚀 Latest: <code>${latest.tag_name}</code> ${status}\n` +
          `📅 Released: ${publishDate}\n` +
          `🔗 <a href="${latest.html_url}">View Release</a>`,
      );
    }

    await ctx.reply(results.join("\n\n"), {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  });
};
