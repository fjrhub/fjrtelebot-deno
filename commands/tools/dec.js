export default (bot) => {
  bot.command("dec", async (ctx) => {
    
    // Regex untuk menghapus "/dec " atau "/dec@username_bot " 
    const input = ctx.message.text.replace(/^\/dec(?:@\w+)?\s*/i, "").trim();
    
    // Pisahkan password dan data json
    const [password, json] = input.split("|").map(s => s.trim());

    if (!password || !json) {
      return ctx.reply("Format:\n/dec password | data_json");
    }

    try {
      const parsed = JSON.parse(json);

      const enc = new TextEncoder();
      const dec = new TextDecoder();

      // 1. Import key material dari password
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
      );

      // 2. Ambil salt dari payload (prioritaskan parsed.salt), fallback ke static salt untuk backward compat
      const salt = parsed.salt 
        ? new Uint8Array(parsed.salt) 
        : enc.encode("fjr-salt"); // ← Fallback ke salt lama jika field salt tidak ada

      // 3. Derive key menggunakan salt yang sesuai
      const key = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt,
          iterations: 100000,
          hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      );

      // 4. Decrypt data
      const decrypted = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: new Uint8Array(parsed.iv),
        },
        key,
        new Uint8Array(parsed.data)
      );

      const result = dec.decode(decrypted);

      // 5. Reply hasil decrypt dengan format HTML
      ctx.reply(`Hasil Decrypt:\n\n<code>${result}</code>`, { parse_mode: "HTML" });
      
    } catch (err) {
      // Log error untuk debugging (opsional, bisa dilihat di console server)
      console.error("Decrypt error:", err);
      ctx.reply("Gagal decrypt ❌\nPassword salah atau data rusak");
    }
  });
};