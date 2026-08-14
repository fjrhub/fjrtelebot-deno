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
      // 1. Ambil SEMUA data harga dari Binance
      const binanceRes = await fetch("https://api.binance.com/api/v3/ticker/24hr");
      
      if (!binanceRes.ok) throw new Error(`Binance HTTP error! status: ${binanceRes.status}`);
      const binanceData = await binanceRes.json();

      const dataMap = binanceData.reduce((acc, curr) => {
        acc[curr.symbol] = curr;
        return acc;
      }, {});

      // 2. Ambil kurs USDT ke IDR (Karena Binance murni USDT)
      let usdtToIdr = 16000; // Nilai fallback default
      try {
        const cgRes = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=idr"
        );
        if (cgRes.ok) {
          const cgData = await cgRes.json();
          usdtToIdr = cgData.tether.idr;
        }
      } catch (e) {
        console.warn("Gagal fetch kurs USDT/IDR, menggunakan nilai fallback.");
      }

      // 3. Olah data
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
        return ctx.reply("❌ Data harga tidak tersedia di Binance.");
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

      // Tambahkan info kurs USDT ke dalam message
      const message = `💰 *Crypto Prices*\n\n\`\`\`\n${table}\n\`\`\`\n\n📊 *Kurs USDT/IDR:* Rp${formatIDR(usdtToIdr)}\n\n_Source: Binance (Spot) + CoinGecko (Kurs IDR)_`;

      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("Crypto price fetch error:", err);
      await ctx.reply("❌ Gagal mengambil harga crypto. Coba lagi nanti.");
    }
  });
};