import { bot } from "../bot.js";

export async function handleApiRequest(req) {
  console.log("======================================");
  console.log("[Deno Worker] 🚨 ADA REQUEST MASUK KE /api");

  // 1. Cek Secret Key
  const secretHeader = req.headers.get("x-vercel-secret");
  const secretEnv = Deno.env.get("API_SECRET");
  
  console.log(`[Deno] Secret Header: ${secretHeader}`);
  console.log(`[Deno] Secret Env:   ${secretEnv}`);

  if (secretHeader !== secretEnv) {
    console.log("[Deno] ❌ SECRET TIDAK COCOK! Request ditolak.");
    return new Response("Unauthorized", { status: 401 });
  }
  console.log("[Deno] ✅ Secret Valid!");

  // 2. Parse Body
  let b;
  try {
    b = await req.json();
    console.log("[Deno] Payload diterima:", JSON.stringify(b, null, 2));
  } catch (err) {
    console.log("[Deno] ❌ Gagal parse JSON body:", err.message);
    return new Response("Invalid JSON", { status: 400 });
  }

  const { chatId, url: mediaUrl, platform, mention } = b;
  console.log(`[Deno] Ekstrak Data -> chatId: ${chatId}, url: ${mediaUrl}`);

  if (!chatId || !mediaUrl) {
    console.log("[Deno] ❌ chatId atau url kosong!");
    return new Response("Missing data", { status: 400 });
  }

  // 3. Test Kirim Pesan ke Telegram (Logika simpel dulu)
  console.log("[Deno] Mencoba mengirim pesan ke Telegram...");
  try {
    await bot.api.sendMessage(
      chatId, 
      `🚀 <b>[DEBUG] Worker Deno Berhasil!</b>\n\nURL: <code>${mediaUrl}</code>\nPlatform: ${platform}\nMention: ${mention}`, 
      { parse_mode: "HTML" }
    );
    console.log("[Deno] ✅ PESAN SUKSES DIKIRIM KE TELEGRAM!");
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("[Deno] ❌ GAGAL KIRIM KE TELEGRAM:", err.message);
    return new Response(`Telegram Error: ${err.message}`, { status: 500 });
  }
}