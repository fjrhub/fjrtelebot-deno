export default (bot) => {
  bot.command("decrypt", async (ctx) => {
    const input = ctx.message.text.replace("/decrypt ", "");
    const [password, json] = input.split("|").map(s => s.trim());

    if (!password || !json) {
      return ctx.reply("Format:\n/decrypt password | data_json");
    }

    try {
      const parsed = JSON.parse(json);

      const enc = new TextEncoder();
      const dec = new TextDecoder();

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
        ["decrypt"]
      );

      const decrypted = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: new Uint8Array(parsed.iv),
        },
        key,
        new Uint8Array(parsed.data)
      );

      const result = dec.decode(decrypted);

      ctx.reply(`Decrypted:\n${result}`);
    } catch (err) {
      ctx.reply("Gagal decrypt ❌\nPassword salah atau data rusak");
    }
  });
};