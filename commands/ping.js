const botStartTime = Date.now();

/* ================= FORMAT LATENCY ================= */
function formatLatency(ms) {
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2).replace('.', '\\.')}s`;
}

export default (bot) => {
  bot.command("ping", async (ctx) => {
    // 🎯 Gunakan performance.now() untuk presisi tinggi
    const start = performance.now();
    
    const uptime = Math.floor((Date.now() - botStartTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    
    // Kirim reply
    await ctx.reply(
      `*🏓 Pong\\!*\n\n` +
      `*Processing:* ${formatLatency(performance.now() - start)}\n` +
      `*Uptime:* ${hours}h ${minutes}m ${seconds}s`,
      { parse_mode: "MarkdownV2" }
    );
  });
};