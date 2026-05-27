export default (bot) => {
  bot.command("calc", async (ctx) => {
    try {
      const input = ctx.match?.trim();

      if (!input) {
        return ctx.reply(
          "Contoh:\n/calc 25*12+100\n/calc (50/2)+7\n/calc 1+1="
        );
      }

      // Validasi karakter aman (tambah =)
      if (!/^[0-9+\-*/().%\s=]+$/.test(input)) {
        return ctx.reply("Hanya angka dan operator matematika yang diizinkan.");
      }

      // Hapus tanda = di akhir sebelum evaluasi
      const expression = input.replace(/=+\s*$/, "");

      // Hitung ekspresi
      const result = Function(`"use strict"; return (${expression})`)();

      if (result === undefined || Number.isNaN(result)) {
        return ctx.reply("Perhitungan tidak valid.");
      }

      await ctx.reply(
        `🧮 Calculator\n\n` +
        `Expression: ${input}\n` +
        `Result: ${result}`
      );

    } catch (err) {
      console.error(err);
      await ctx.reply("Gagal menghitung. Periksa format input.");
    }
  });
};