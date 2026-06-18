export default (bot) => {
  bot.command("dec", async (ctx) => {
    
    // Regex to remove "/dec " or "/dec@username_bot "
    const input = ctx.message.text.replace(/^\/dec(?:@\w+)?\s*/i, "").trim();
    
    // Split password and json data
    const [password, json] = input.split("|").map(s => s.trim());

    if (!password || !json) {
      return ctx.reply("Format:\n/dec password | data_json");
    }

    try {
      const parsed = JSON.parse(json);

      const enc = new TextEncoder();
      const dec = new TextDecoder();

      // 1. Import key material from password
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
      );

      // 2. Get salt from payload (prioritize parsed.salt), fallback to static salt for backward compatibility
      const salt = parsed.salt 
        ? new Uint8Array(parsed.salt) 
        : enc.encode("fjr-salt"); // ← Fallback to old salt if salt field is missing

      // 3. Derive key using the appropriate salt
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

      // 5. Reply decrypt result in HTML format
      ctx.reply(`Decrypt Result:\n\n<code>${result}</code>`, { parse_mode: "HTML" });
      
    } catch (err) {
      // Log error for debugging (optional, can be seen in server console)
      console.error("Decrypt error:", err);
      ctx.reply("Decryption failed ❌\nWrong password or corrupted data");
    }
  });
};