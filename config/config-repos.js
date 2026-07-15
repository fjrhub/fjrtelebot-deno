export const repos = [
  { name: "NextPlayer", url: "https://github.com/anilbeesetti/nextplayer" },
  { name: "yt-dlp", url: "https://github.com/yt-dlp/yt-dlp" },
  { name: "aves", url: "https://github.com/deckerst/aves" },
  { name: "Aegis", url: "https://github.com/beemdevelopment/Aegis" },
  { name: "ImageToolbox", url: "https://github.com/T8RIN/ImageToolbox" },
];

export function parseGithubUrl(url) {
  const parts = url.replace("https://github.com/", "").split("/");
  return { owner: parts[0], repo: parts[1] };
}

export async function fetchLatestRelease(owner, repo) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
      { headers: { "Accept": "application/vnd.github+json", "User-Agent": "Deno-Bot/1.0" } }
    );
    if (!res.ok) return null;
    return (await res.json()).tag_name;
  } catch {
    return null;
  }
}
