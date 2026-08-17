export default async function handler(req, res) {
  // Pastikan hanya menerima request method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Hanya menerima method POST' });
  }

  // Ambil input dari body request
  const { chatId, url } = req.body;

  if (!chatId || !url) {
    return res.status(400).json({ error: 'chatId dan url wajib diisi' });
  }

  // Ambil Token Bot dari Environment Variables Vercel
  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) {
    return res.status(500).json({ error: 'BOT_TOKEN belum disetting di Vercel!' });
  }

  // Format pesan testing
  const pesan = `🤖 <b>Testing Berhasil!</b>\n\nVercel berhasil mendeteksi dan meneruskan URL.\n\nURL: <code>${url}</code>\n\n<i>Bot siap memproses lebih lanjut di Deno.</i>`;

  try {
    // Kirim pesan ke Telegram
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: pesan,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();
    
    if (result.ok) {
      return res.status(200).json({ success: true, message: 'Pesan berhasil dikirim ke user!' });
    } else {
      return res.status(500).json({ success: false, error: result.description });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}