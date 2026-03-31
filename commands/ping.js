/* ================= FORMAT LATENCY ================= */
function formatLatency(ms) {
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2).replace(".", "\\.")}s`;
}

export default (bot) => {
  bot.command("ping", async (ctx) => {
    // 🎯 Gunakan performance.now() untuk presisi tinggi
    const start = performance.now();
    const mem = Deno.memoryUsage();
    const rssMB = Math.round(mem.rss / 1024 / 1024);

    // Kirim reply
    await ctx.reply(
      `*🏓 Pong\\!*\n\n` +
        `*Processing:* ${formatLatency(performance.now() - start)}\n` +
        `*Memory:* ${rssMB}MB`,
      { parse_mode: "MarkdownV2" },
    );
  });
};
