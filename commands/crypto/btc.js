const formatUSD = (num) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

const formatIDR = (num) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(num);

const coins = [
  { symbol: "BTCUSDT", display: "BTC" },
  { symbol: "ETHUSDT", display: "ETH" },
  { symbol: "XAUTUSDT", display: "XAUT" },
  { symbol: "HYPEUSDT", display: "HYPE" },
  { symbol: "TAOUSDT", display: "TAO" },
  { symbol: "SOLUSDT", display: "SOL" },
];

export default (bot) => {
  bot.command("btc", async (ctx) => {
    try {
      // 1. Fetch ALL price data from Binance
      const binanceRes = await fetch("https://api.binance.com/api/v3/ticker/24hr");
      
      if (!binanceRes.ok) throw new Error(`Binance HTTP error! status: ${binanceRes.status}`);
      const binanceData = await binanceRes.json();

      const dataMap = binanceData.reduce((acc, curr) => {
        acc[curr.symbol] = curr;
        return acc;
      }, {});

      // 2. Fetch USDT to IDR exchange rate (since Binance is purely USDT)
      let usdtToIdr = 16000; // Default fallback value
      try {
        const cgRes = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=idr"
        );
        if (cgRes.ok) {
          const cgData = await cgRes.json();
          usdtToIdr = cgData.tether.idr;
        }
      } catch (e) {
        console.warn("Failed to fetch USDT/IDR exchange rate, using fallback value.");
      }

      // 3. Process data
      const rows = coins
        .map((coin) => {
          const priceData = dataMap[coin.symbol];
          if (!priceData) return null; 

          const priceUsdt = parseFloat(priceData.lastPrice);
          const priceIdr = priceUsdt * usdtToIdr; 

          return {
            symbol: coin.display,
            usd: `$${formatUSD(priceUsdt)}`,
            idr: `Rp${formatIDR(priceIdr)}`,
          };
        })
        .filter(Boolean);

      if (rows.length === 0) {
        return ctx.reply("❌ Price data is not available on Binance.");
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

      // Add USDT exchange rate info to the message
      const message = `💰 *Crypto Prices*\n\n\`\`\`\n${table}\n\`\`\`\n\n📊 *USDT/IDR Rate:* Rp${formatIDR(usdtToIdr)}\n\n_Source: Binance (Spot) + CoinGecko (IDR Rate)_`;

      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("Crypto price fetch error:", err);
      await ctx.reply("❌ Failed to fetch crypto prices. Please try again later.");
    }
  });
};
