export default (bot) => {
  bot.command("start", (ctx) => {
    ctx.reply("Bot active 🚀\n\nUsage: /send <video_url>");
  });

  bot.command("send", async (ctx) => {
    const rawText = ctx.message?.text || "";
    const url = rawText.replace(/^\/send\s+/i, "").trim();

    if (!url) {
      return ctx.reply("⚠️ Invalid format!\nUsage: /send <video_url>");
    }

    try {
      new URL(url);
    } catch {
      return ctx.reply("❌ Invalid URL. Make sure the link is complete (https://...)");
    }

    try {
      await ctx.replyWithChatAction("upload_video");

      // ✅ Caption: "Sender: @username" with clickable inline mention
      const sender = ctx.from;
      let caption = "Sender: Unknown";

      if (sender) {
        const displayName = sender.username
          ? `@${sender.username}`
          : sender.first_name;

        caption = `Sender: <a href="tg://user?id=${sender.id}">${displayName}</a>`;
      }

      // ✅ Send video first
      await ctx.replyWithVideo(url, {
        caption,
        parse_mode: "HTML",
        supports_streaming: true,
      });

      // ✅ Delete user's command message after successful send
      try {
        await ctx.deleteMessage();
      } catch (deleteErr) {
        console.warn("Failed to delete user message:", deleteErr.description);
      }
    } catch (error) {
      console.error("Failed to send video:", error);

      const desc = error.description || error.message || "";

      if (
        desc.includes("wrong file identifier") ||
        desc.includes("Failed to get HTTP URL content") ||
        desc.includes("Bad Request: invalid") ||
        desc.includes("not found")
      ) {
        return ctx.reply(
          "⚠️ Cannot send as video.\nThe URL may not be a direct link or has expired."
        );
      }

      ctx.reply(`❌ Failed: ${desc}`);
    }
  });
};