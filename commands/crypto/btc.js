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
          maximumFractionDigits: 2,
        }).format(num);

      const formatIDR = (num) => {
        if (num >= 1_000_000_000)
          return "Rp" + (num / 1_000_000_000).toFixed(2) + "B";
        if (num >= 1_000_000)
          return "Rp" + (num / 1_000_000).toFixed(1) + "M";
        if (num >= 1_000)
          return "Rp" + (num / 1_000).toFixed(0) + "K";
        return "Rp" + num;
      };

      let message = `💰 *Crypto Prices*\n\n`;

      for (const coin of coins) {
        const price = data[coin.id];
        if (!price) continue;

        const usd = `$${formatUSD(price.usd)}`;
        const idr = formatIDR(price.idr);

        message += `${coin.symbol.padEnd(4, " ")}: ${usd} | ${idr}\n`;
      }

      message += `\n_Source: CoinGecko_`;

      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("Crypto price fetch error:", err);
      await ctx.reply("❌ Gagal mengambil harga crypto. Coba lagi nanti.");
    }
  });
};
