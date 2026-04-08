export default (bot) => {
  bot.command("btc", async (ctx) => {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether-gold,hyperliquid&vs_currencies=usd,idr"
      );
      const data = await res.json();
      
      const coins = [
        { id: "bitcoin", symbol: "BTC", name: "Bitcoin", emoji: "₿" },
        { id: "ethereum", symbol: "ETH", name: "Ethereum", emoji: "Ξ" },
        { id: "tether-gold", symbol: "XAUT", name: "Tether Gold", emoji: "🥇" },
        { id: "hyperliquid", symbol: "HYPE", name: "Hyperliquid", emoji: "⚡" }
      ];

      let message = `💰 *Crypto Prices*\n\n`;
      
      for (const coin of coins) {
        const price = data[coin.id];
        if (!price) continue;
        
        const usd = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(price.usd);
        
        const idr = new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
        }).format(price.idr);
        
        message += `${coin.emoji} *${coin.name}* (${coin.symbol})\n` +
                   `🇺🇸 ${usd}\n` +
                   `🇮🇩 ${idr}\n\n`;
      }
      
      message += `_Source: CoinGecko_`;
      
      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("Crypto price fetch error:", err);
      await ctx.reply("❌ Gagal mengambil harga crypto. Coba lagi nanti.");
    }
  });
};
