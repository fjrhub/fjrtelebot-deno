export default (bot) => {
  bot.command("enc", async (ctx) => {
    
    // Regex untuk menghapus "/enc " atau "/enc@username_bot "
    const input = ctx.message.text.replace(/^\/enc(?:@\w+)?\s*/i, "").trim();
    
    // Pisahkan password dan teks
    const [password, text] = input.split("|").map(s => s.trim());

    if (!password || !text) {
      return ctx.reply("Format:\n/enc password | teks");
    }

    const enc = new TextEncoder();

    try {
      // derive key dari password
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: enc.encode("fjr-salt"),
          iterations: 100000,
          hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
      );

      const iv = crypto.getRandomValues(new Uint8Array(12));

      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        enc.encode(text)
      );

      const result = JSON.stringify({
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encrypted)),
      });

      // Keterangan "Hasil Encrypt:" ditambahkan di sini, dengan hasil dibungkus <code>
      ctx.reply(`Hasil Encrypt:\n\n<code>${result}</code>`, { parse_mode: "HTML" });
    } catch (err) {
      ctx.reply("Gagal encrypt ❌");
    }
  });
};