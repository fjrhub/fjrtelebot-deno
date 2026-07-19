import { kv } from "../../kv.js";
import { repos, parseGithubUrl } from "../../config/config-repos.js";

// Konfigurasi headers dan User-Agent untuk API GitHub
const GITHUB_API_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "Telegram-Bot/1.0",
};

// Fungsi untuk fetch latest release dengan error handling yang lebih baik
const fetchLatestRelease = async (owner, repo) => {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
      { headers: GITHUB_API_HEADERS }
    );

    if (!res.ok) {
      console.error(`Failed to fetch release for ${owner}/${repo}: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return {
      tag_name: data.tag_name,
      published_at: data.published_at,
      html_url: data.html_url,
    };
  } catch (error) {
    console.error(`Error fetching release for ${owner}/${repo}:`, error);
    return null;
  }
};

// Fungsi untuk memformat tanggal
const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Fungsi untuk generate pesan status
const getStatusMessage = (savedVer, latestTag) => {
  if (savedVer == null) {
    return { status: "⚪ Not set", previousDisplay: "Not set" };
  }
  return {
    status: savedVer === latestTag ? "✅ Up to date" : "🆕 Update available!",
    previousDisplay: savedVer,
  };
};

// Fungsi untuk generate pesan hasil
const generateResultMessage = (r, latest, status, previousDisplay) => {
  return [
    `🔹 <b>${r.name}</b>`,
    `📦 Previous: <code>${previousDisplay}</code>`,
    `🚀 Latest: <code>${latest.tag_name}</code> ${status}`,
    `📅 Released: ${formatDate(latest.published_at)}`,
    `🔗 <a href="${latest.html_url}">View Release</a>`,
  ].join("\n");
};

export default (bot) => {
  bot.command("github", async (ctx) => {
    const userId = ctx.from?.id ?? ctx.chat.id;
    const results = [];

    // Fetch semua release secara parallel untuk efisiensi
    const releasePromises = repos.map(async (r) => {
      const { owner, repo } = parseGithubUrl(r.url);
      const latest = await fetchLatestRelease(owner, repo);
      return { repo: r, owner, repoName: repo, latest };
    });

    const releaseResults = await Promise.all(releasePromises);

    for (const { repo: r, owner, repoName, latest } of releaseResults) {
      if (!latest) {
        results.push(`🔹 <b>${r.name}</b>\n❌ Failed to fetch data or repo is private`);
        continue;
      }

      const kvKey = ["gh_ver", userId, owner, repoName];
      const { value: savedVer } = await kv.get(kvKey);

      const { status, previousDisplay } = getStatusMessage(savedVer, latest.tag_name);
      const message = generateResultMessage(r, latest, status, previousDisplay);
      results.push(message);
    }

    await ctx.reply(results.join("\n\n"), {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  });
};