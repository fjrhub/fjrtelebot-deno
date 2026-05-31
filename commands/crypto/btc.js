export default (bot) => {
  bot.command("btc", async (ctx) => {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether-gold,hyperliquid,bittensor,solana&vs_currencies=usd,idr"
      );
      const data = await res.json();

      const coins = [
        { id: "bitcoin", symbol: "BTC" },
        { id: "ethereum", symbol: "ETH" },
        { id: "tether-gold", symbol: "XAUT" },
        { id: "hyperliquid", symbol: "HYPE" },
        { id: "bittensor", symbol: "TAO" },
        { id: "solana", symbol: "SOL" },
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

      const rows = [];

      for (const coin of coins) {
        const price = data[coin.id];
        if (!price) continue;

        const usd = `$${formatUSD(price.usd)}`;
        const idr = `Rp${formatIDR(price.idr)}`;

        rows.push({
          symbol: coin.symbol,
          usd,
          idr,
        });
      }

      const maxSymbol = Math.max(...rows.map((r) => r.symbol.length));
      const maxUsd = Math.max(...rows.map((r) => r.usd.length));
      const maxIdr = Math.max(...rows.map((r) => r.idr.length));

      let table = "";

      for (const r of rows) {
        table += `${r.symbol.padEnd(maxSymbol)}  ${r.usd.padStart(maxUsd)} │ ${r.idr.padStart(maxIdr)}\n`;
      }

      const message =
        `💰 *Crypto Prices*\n\n` +
        "```\n" +
        table +
        "```\n" +
        `_Source: CoinGecko_`;

      await ctx.reply(message, {
        parse_mode: "Markdown",
      });
    } catch (err) {
      console.error("Crypto price fetch error:", err);
      await ctx.reply("❌ Gagal mengambil harga crypto. Coba lagi nanti.");
    }
  });
};