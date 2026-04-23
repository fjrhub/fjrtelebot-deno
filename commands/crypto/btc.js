export default (bot) => {
  bot.command("btc", async (ctx) => {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether-gold,hyperliquid,binancecoin&vs_currencies=usd,idr"
      );
      const data = await res.json();

      const coins = [
        { id: "bitcoin", symbol: "BTC" },
        { id: "ethereum", symbol: "ETH" },
        { id: "tether-gold", symbol: "XAUT" },
        { id: "hyperliquid", symbol: "HYPE" },
        { id: "binancecoin", symbol: "BNB" },
      ];

      const formatUSD = (num) =>
        new Intl.NumberFormat("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(num);

      const formatIDR = (num) =>
        new Intl.NumberFormat("id-ID", {
          maximumFractionDigits: 0,
        }).format(num);

      let message = `💰 *Crypto Prices*\n\n`;

      for (const coin of coins) {
        const price = data[coin.id];
        if (!price) continue;

        const usd = `$${formatUSD(price.usd)}`;
        const idr = `Rp${formatIDR(price.idr)}`;

        // alignment (biar "|" sejajar)
        const left = `${coin.symbol}`.padEnd(4, " ");
        const usdCol = usd.padStart(10, " ");
        const idrCol = idr.padStart(15, " ");

        message += `${left} ${usdCol} | ${idrCol}\n`;
      }

      message += `\n_Source: CoinGecko_`;

      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("Crypto price fetch error:", err);
      await ctx.reply("❌ Gagal mengambil harga crypto. Coba lagi nanti.");
    }
  });
};
