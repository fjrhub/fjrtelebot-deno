export default async function handler(req, res) {
  // Handle GET request (kalau dibuka di browser)
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      bot: '@CahayaMalamBot',
      message: 'Webhook aktif. Kirim POST dari Telegram.'
    });
  }

  // Hanya proses POST
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // Payload asli dari Telegram
    const update = req.body;
    const message = update?.message;
    const text = message?.text || '';
    const chatId = message?.chat?.id;

    // Kalau bukan pesan teks biasa, abaikan
    if (!chatId || !text) {
      return res.status(200).send('OK');
    }

    // Regex untuk mendeteksi URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);

    if (urls && urls.length > 0) {
      console.log(`[Vercel] URL ditemukan: ${urls[0]} | ChatID: ${chatId}`);

      const DENO_URL = process.env.DENO_ENDPOINT_URL;

      if (DENO_URL) {
        // ⚡ FIRE AND FORGET — tidak pakai await!
        // Langsung lempar ke Deno, Vercel tidak menunggu
        fetch(DENO_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-From': 'vercel-cahaya-malam-bot'
          },
          body: JSON.stringify(update) // Kirim payload Telegram ASLI
        }).catch(err => console.error('[Vercel] Gagal forward ke Deno:', err));
      } else {
        console.warn('[Vercel] DENO_ENDPOINT_URL belum diset!');
      }
    } else {
      console.log(`[Vercel] Bukan URL, abaikan. ChatID: ${chatId}`);
    }

  } catch (error) {
    console.error('[Vercel] Error:', error);
  }

  // ✅ SELALU balas 200 ke Telegram agar tidak retry
  return res.status(200).send('OK');
}