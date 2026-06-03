const formatUSD = (num) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

const formatIDR = (num) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(num);

const coins = [
  { id: "bitcoin", symbol: "BTC" },
  { id: "ethereum", symbol: "ETH" },
  { id: "tether-gold", symbol: "XAUT" },
  { id: "hyperliquid", symbol: "HYPE" },
  { id: "bittensor", symbol: "TAO" },
  { id: "solana", symbol: "SOL" },
];

export default (bot) => {
  bot.command("btc", async (ctx) => {
    try {
      const ids = coins.map((c) => c.id).join(",");
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,idr`
      );

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();

      const rows = coins
        .map((coin) => {
          const price = data[coin.id];
          if (!price) return null;
          return {
            symbol: coin.symbol,
            usd: `$${formatUSD(price.usd)}`,
            idr: `Rp${formatIDR(price.idr)}`,
          };
        })
        .filter(Boolean);

      if (rows.length === 0) {
        return ctx.reply("❌ Data harga tidak tersedia.");
      }

      const maxSymbol = Math.max(...rows.map((r) => r.symbol.length));
      const maxUsd = Math.max(...rows.map((r) => r.usd.length));
      const maxIdr = Math.max(...rows.map((r) => r.idr.length));

      const table = rows
        .map(
          (r) =>
            `${r.symbol.padEnd(maxSymbol)} ${r.usd.padStart(maxUsd)} │ ${r.idr.padStart(maxIdr)}`
        )
        .join("\n");

      const message = `💰 *Crypto Prices*\n\n\`\`\`\n${table}\n\`\`\`\n\n_Source: CoinGecko_`;

      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("Crypto price fetch error:", err);
      await ctx.reply("❌ Gagal mengambil harga crypto. Coba lagi nanti.");
    }
  });
};
