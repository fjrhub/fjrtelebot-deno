import Groq from "npm:groq-sdk";
import OpenAI from "npm:openai";
import { kv } from "../../kv.js"; // Sesuaikan path jika perlu

/* ================= AI CLIENTS ================= */
const groq = globalThis._groq ?? new Groq({ apiKey: Deno.env.get("GROQ_API_KEY") });
globalThis._groq = groq;

const openrouter = globalThis._openrouter ?? new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: Deno.env.get("OPENROUTER_API_KEY"),
  defaultHeaders: {
    "HTTP-Referer": Deno.env.get("SITE_URL") || "https://localhost",
    "X-Title": "FJRToolsBot",
  },
});
globalThis._openrouter = openrouter;

/* ================= CONFIG FETCHER ================= */
export async function getAIConfig() {
  try {
    // Mengambil provider dan model secara paralel untuk efisiensi
    const [providerRes, modelRes] = await Promise.all([
      kv.get(["ai_provider"], { cached: true }),
      kv.get(["ai_model"], { cached: true }),
    ]);
    
    return {
      provider: providerRes.value || "groq", // Default: "groq" atau "openrouter"
      model: modelRes.value || "qwen/qwen3-32b",
    };
  } catch (err) {
    console.error("[AIConfig] Error:", err.message);
    return { provider: "groq", model: "qwen/qwen3-32b" };
  }
}

/* ================= AI REQUEST ================= */
export async function sendToAI(messages) {
  try {
    const { provider, model } = await getAIConfig();
    
    let res;
    if (provider === "openrouter") {
      res = await openrouter.chat.completions.create({
        model,
        messages,
        temperature: 1,
        max_tokens: 2048,
      });
    } else {
      // Fallback ke Groq
      res = await groq.chat.completions.create({
        model,
        messages,
        temperature: 1,
        max_tokens: 2048,
      });
    }

    let content = res.choices?.[0]?.message?.content || "❌ No response.";
    
    // Cleanup: hapus tag <think> dan rapikan heading markdown
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    content = content.replace(/^#{1,6}\s+\*\*(.+?)\s*\*\*\s*$/gm, "**$1**");
    content = content.replace(/^#{1,6}\s+(.+)$/gm, "**$1**");
    content = content.replace(/\*\*(.+?)\s+\*\*/g, "**$1**");
    
    return content;
  } catch (err) {
    console.error(`[${(await getAIConfig()).provider.toUpperCase()} ERROR]:`, err);
    
    // Handle Rate Limit (429)
    if (err.status === 429 || err.error?.status === 429) {
      const e = new Error("rate_limit");
      e.isRateLimit = true;
      throw e;
    }
    
    // Handle Payload Too Large / Context Length (413 atau pesan spesifik)
    if (err.status === 413 || err.error?.status === 413 || err.message?.includes("maximum context length")) {
      const e = new Error("too_large");
      e.isTooLarge = true;
      throw e;
    }
    
    // Handle Unauthorized (401)
    if (err.status === 401 || err.error?.status === 401) {
      return "❌ API key salah atau tidak valid.";
    }
    
    return "❌ Gagal mengambil jawaban AI.";
  }
}