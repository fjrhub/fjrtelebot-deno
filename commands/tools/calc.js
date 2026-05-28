export default (bot) => {
  bot.command("calc", async (ctx) => {
    try {
      const input = ctx.match?.trim();

      if (!input) {
        return ctx.reply(
          "Contoh:\n/calc 25*12+100\n/calc (50/2)+7\n/calc 100.000+50.000\n/calc 1,5*2"
        );
      }

      // Validasi karakter aman (sudah include tanda =, tambah koma untuk desimal)
      if (!/^[0-9+\-*/().,%\s=]+$/.test(input)) {
        return ctx.reply("Hanya angka dan operator matematika yang diizinkan.");
      }

      // Hapus tanda = di akhir sebelum evaluasi
      let expression = input.replace(/=+\s*$/, "");

      // Normalisasi format angka Indonesia:
      // - Titik (.) sebagai pemisah ribuan → dihapus
      // - Koma (,) sebagai pemisah desimal → diganti jadi titik (.)
      expression = expression
        .replace(/\./g, '')      // Hapus semua titik (thousands separator)
        .replace(/,/g, '.');     // Ubah koma jadi titik (decimal separator)

      // Hitung ekspresi
      const result = Function(`"use strict"; return (${expression})`)();

      if (result === undefined || Number.isNaN(result) || !Number.isFinite(result)) {
        return ctx.reply("Perhitungan tidak valid.");
      }

      // Format angka: pemisah ribuan pakai titik, desimal pakai koma (standar Indonesia)
      const formattedResult = Number(result).toLocaleString('id-ID', {
        maximumFractionDigits: 10
      });

      await ctx.reply(
        `🧮 Calculator\n\n` +
        `Expression: ${input}\n` +
        `Result: ${formattedResult}`
      );

    } catch (err) {
      console.error(err);
      await ctx.reply("Gagal menghitung. Periksa format input.");
    }
  });
};