export default (bot) => {
  bot.command("format1", async (ctx) => {
    const text = ctx.message?.text || "";

    // =========================
    // Helper ambil value
    // =========================
    const getValue = (patterns) => {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1]?.trim();
      }
      return "-";
    };

    // =========================
    // Helper rupiah -> number
    // =========================
    const toNumber = (val) => {
      if (!val || val === "-") return 0;
      return parseInt(val.replace(/[^\d]/g, "")) || 0;
    };

    // =========================
    // Format token (2 baris)
    // =========================
    const formatToken = (val) => {
      if (!val || val === "-") return "-";

      const clean = val.replace(/\D/g, "");
      if (clean.length < 16) return val;

      const grouped = clean.match(/.{1,4}/g) || [];

      const line1 = grouped.slice(0, 3).join(" ");
      const line2 = grouped.slice(3).join(" ");

      return line2 ? `${line1}\n${line2}` : line1;
    };

    // =========================
    // Parsing data (Regex fleksibel)
    // =========================
    const orderId = getValue([
      /No\.?\s*Pesanan:\s*(\d+)/i,
    ]);

    const date = getValue([
      /Tanggal Transaksi\s*\n\s*(.+)/i,
    ]);

    const rawToken = getValue([
      /STROOM\/?TOKEN\s*\n\s*([\d\s]+)/i, // Fleksibel untuk "STROOM/TOKEN" atau "STROOM TOKEN"
      /(\d[\d\s]{15,})/,                   // Fallback jika ada deretan angka panjang
    ]);

    const token = formatToken(rawToken);

    const meter = getValue([
      /NO\s*METER\s*\n\s*(\d+)/i,          // Fleksibel untuk "NO METER" atau "NOMOR METER"
    ]);

    const customerName = getValue([
      /NAMA\s*\n\s*(.+)/i,                 // Fleksibel untuk "NAMA" atau "Nama Pelanggan"
      /Nama\s+Pelanggan:\s*(.+)/i,
    ]);

    const tarif = getValue([
      /TARIF\/?DAYA\s*\n\s*(.+)/i,         // Fleksibel untuk "TARIF/DAYA" atau "TARIF DAYA"
      /Tarif\/Daya\s*\n\s*(.+)/i,
    ]);

    const kwh = getValue([
      /JML\s*KWH\s*\n\s*(.+)/i,            // Fleksibel untuk "JML KWH"
      /JUMLAH\s*KWH\s*\n\s*(.+)/i,         // Fleksibel untuk "JUMLAH KWH"
    ]);

    const stroom = getValue([
      /RP\s*STROOM\/?TOKEN\s*\n\s*(.+)/i,  // Fleksibel untuk "RP STROOM/TOKEN"
    ]);

    const pbjt = getValue([
      /PBJT-TL\s*\n\s*(.+)/i,
    ]);

    // =========================
    // Hitung total
    // =========================
    const totalNumber = toNumber(stroom) + toNumber(pbjt);
    const total = totalNumber
      ? "Rp" + totalNumber.toLocaleString("id-ID")
      : "-";

    // =========================
    // Formatter
    // =========================
    const formatLine = (label, value) => {
      return label.padEnd(18, " ") + " : " + value;
    };

    // =========================
    // TOKEN
    // =========================
    await ctx.reply("```\n" + token + "\n```", {
      parse_mode: "Markdown",
    });

    // =========================
    // DETAIL
    // =========================
    const detailMsg = `
${formatLine("No Pesanan", orderId)}
${formatLine("Tanggal", date)}
${formatLine("No Meter", meter)}
${formatLine("Nama", customerName.toUpperCase())}
${formatLine("Tarif Daya", tarif)}
${formatLine("Jumlah kWh", kwh)}
${formatLine("Produk", `Token PLN ${total}`)}
    `.trim();

    await ctx.reply("```\n" + detailMsg + "\n```", {
      parse_mode: "Markdown",
    });
  });
};