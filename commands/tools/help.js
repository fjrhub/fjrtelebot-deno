export default (bot) => {
  bot.command("help", (ctx) => {
    const helpMessage = `*🤖 FJRToolsBot - AI Assistant & Utilities*

*📝 AI & Chat:*
• /ai <tanya> \- Chat interaktif dengan AI
• /model \- Pilih model AI yang tersedia
• /cekmodel \- Lihat model yang sedang aktif
• /history \- Export history chat ke JSON
• /reset \- Hapus riwayat percakapan

*🛠️ Tools & Utility:*
• /github \- Info repository/user GitHub
• /encrypt \- Enkripsi teks (keamanan)
• /decrypt \- Dekripsi teks rahasia
• /ping \- Cek latensi respon bot
• /tagall \- Mention semua anggota grup

*💰 Finance:*
• /btc \- Info harga Bitcoin terkini

*⚙️ System & Owner:*
• /start \- Memulai interaksi bot
• /setver \- Set versi bot (Admin)
• /resetver \- Reset versi bot (Admin)
• /historyall \- Cek semua log (Owner)
• /resetall \- Bersihkan semua data (Owner)

*✨ Fitur Utama:*
• *Dual-History:* Terpisah antara Private & Group.
• *Auto-Trim:* Menjaga memori tetap ringan.
• *Auto-Split:* Mendukung pesan yang sangat panjang.
• *Persistence:* Data tersimpan aman di Cloud KV.`;

    return ctx.reply(helpMessage, { parse_mode: "Markdown" });
  });
};