import { kv } from "../../kv.js";
import { repos, parseGithubUrl } from "../../config/config-repos.js";

export default (bot) => {
  bot.command("resetver", async (ctx) => {
    const userId = ctx.from?.id ?? ctx.chat.id;
    let cleared = 0;

    for (const r of repos) {
      const { owner, repo } = parseGithubUrl(r.url);
      const kvKey = ["gh_ver", userId, owner, repo];
      const { value } = await kv.get(kvKey);
      
      if (value != null) {
        await kv.delete(kvKey);
        cleared++;
      }
    }

    ctx.reply(
      `✅ Cleared <b>${cleared}</b> tracked version(s).`,
      { parse_mode: "HTML" }
    );
  });
};