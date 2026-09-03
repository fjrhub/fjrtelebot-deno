// 1. Optimasi: Buat instance formatter sekali di luar fungsi untuk menghemat memori dan CPU
const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Format id-ID secara default menghasilkan "Rp10.000" (tanpa spasi), sesuai preferensi Anda
const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const coins = [
  { symbol: "BTCUSDT", display: "BTC" },
  { symbol: "ETHUSDT", display: "ETH" },
  { symbol: "XAUTUSDT", display: "XAUT" },
  { symbol: "HYPEUSDT", display: "HYPE" },
  { symbol: "TAOUSDT", display: "TAO" },
  { symbol: "SOLUSDT", display: "SOL" },
];

export default (bot) => {
  // Saran: Ubah command menjadi "prices" atau "crypto" karena mengambil banyak koin, bukan hanya BTC
  bot.command("prices", async (ctx) => {
    try {
      // 2. Optimasi: Ambil hanya simbol yang dibutuhkan untuk mengurangi ukuran payload API secara drastis
      const symbolsParam = JSON.stringify(coins.map((c) => c.symbol));
      const binanceRes = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`
      );

      if (!binanceRes.ok) {
        throw new Error(`Binance HTTP error! status: ${binanceRes.status}`);
      }
      
      const binanceData = await binanceRes.json();

      // 3. Ambil kurs USDT ke IDR
      let usdtToIdr = 16000; // Fallback value
      try {
        const cgRes = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=idr"
        );
        if (cgRes.ok) {
          const cgData = await cgRes.json();
          usdtToIdr = cgData.tether.idr;
        }
      } catch (e) {
        console.warn("Gagal mengambil kurs USDT/IDR, menggunakan nilai fallback.");
      }

      // 4. Proses data dengan penambahan indikator visual (▲/▼)
      const rows = coins
        .map((coin) => {
          const priceData = binanceData.find((d) => d.symbol === coin.symbol);
          if (!priceData) return null;

          const priceUsdt = parseFloat(priceData.lastPrice);
          const priceIdr = priceUsdt * usdtToIdr;
          const changePercent = parseFloat(priceData.priceChangePercent);
          
          // Indikator visual: ▲ untuk naik, ▼ untuk turun
          const trendIcon = changePercent >= 0 ? "▲" : "▼";

          return {
            symbol: coin.display,
            usd: usdFormatter.format(priceUsdt),
            idr: idrFormatter.format(priceIdr), // Otomatis menjadi "Rp10.000"
            trend: trendIcon,
          };
        })
        .filter(Boolean);

      if (rows.length === 0) {
        return ctx.reply("❌ Data harga tidak tersedia di Binance.");
      }

      // 5. Format tabel agar tetap rapi (monospace)
      const maxSymbol = Math.max(...rows.map((r) => r.symbol.length));
      const maxUsd = Math.max(...rows.map((r) => r.usd.length));
      const maxIdr = Math.max(...rows.map((r) => r.idr.length));

      const table = rows
        .map(
          (r) =>
            `${r.trend} ${r.symbol.padEnd(maxSymbol)} ${r.usd.padStart(maxUsd)} │ ${r.idr.padStart(maxIdr)}`
        )
        .join("\n");

      const message = 
        `💰 *Crypto Prices*\n\n` +
        `\`\`\`\n${table}\n\`\`\`\n\n` +
        `📊 *Kurs USDT/IDR:* ${idrFormatter.format(usdtToIdr)}\n\n` +
        `_Sumber: Binance (Spot) + CoinGecko (Kurs IDR)_`;

      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("Crypto price fetch error:", err);
      await ctx.reply("❌ Gagal mengambil harga crypto. Silakan coba lagi nanti.");
    }
  });
};
