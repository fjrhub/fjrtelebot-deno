export default (bot) => {
  bot.command("btc", async (ctx) => {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,idr"
      );
      const data = await res.json();
      const btc = data.bitcoin;

      const usd = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(btc.usd);

      const idr = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(btc.idr);

      await ctx.reply(
        `💰 *Bitcoin Price*\n\n` +
          `🇺🇸 ${usd}\n` +
          `🇮🇩 ${idr}\n\n` +
          `_Source: CoinGecko_`,
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      console.error("BTC price fetch error:", err);
      await ctx.reply("❌ Gagal mengambil harga Bitcoin. Coba lagi nanti.");
    }
  });
};