export default (bot) => {
  bot.command("format", async (ctx) => {
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
    // Format token (2 baris, 4 digit)
    // =========================
    const formatToken = (val) => {
      if (!val || val === "-") return "-";

      const clean = val.replace(/\D/g, "");

      // opsional validasi minimal
      if (clean.length < 16) return val;

      const grouped = clean.match(/.{1,4}/g) || [];

      const line1 = grouped.slice(0, 3).join(" ");
      const line2 = grouped.slice(3).join(" ");

      return line2 ? `${line1}\n${line2}` : line1;
    };

    // =========================
    // Parsing data
    // =========================
    const orderId = getValue([
      /No\.?\s*Pesanan:\s*(\d+)/i,
      /Nomor pesanan:\s*(\d+)/i,
    ]);

    const date = getValue([
      /Tanggal Transaksi\s*\n\s*(.+)/i,
      /Tanggal transaksi:\s*(.+)/i,
    ]);

    // 🔥 SUPPORT TOKEN FLEXIBLE
    const rawToken = getValue([
      // multi-line + spasi
      /Stroom\/Nomor Token\s*\n\s*([\d\s]+)/i,

      // fallback angka panjang (dengan/ tanpa spasi)
      /(\d[\d\s]{15,})/,
    ]);

    const token = formatToken(rawToken);

    const customerId = getValue([
      /Nomor Pelanggan\s*\n\s*(\d+)/i,
      /Nomor pelanggan:\s*(\d+)/i,
    ]);

    const customerName = getValue([
      /Nama\s*\n\s*(.+)/i,
      /Nama pelanggan:\s*(.+)/i,
    ]);

    const tarif = getValue([
      /Tarif Daya\s*\n\s*(.+)/i,
    ]);

    const kwh = getValue([
      /Jumlah KwH\s*\n\s*(.+)/i,
    ]);

    const stroom = getValue([
      /Rp Stroom\/Token\s*\n\s*(.+)/i,
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
      return label.padEnd(14, " ") + " : " + value;
    };

    // =========================
    // 1. TOKEN
    // =========================
    await ctx.reply("```\n" + token + "\n```", {
      parse_mode: "Markdown",
    });

    // =========================
    // 2. DETAIL
    // =========================
    const detailMsg = `
${formatLine("No Pesanan", orderId)}
${formatLine("Tanggal", date)}
${formatLine("No Pelanggan", customerId)}
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