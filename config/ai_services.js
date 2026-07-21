import Groq from "npm:groq-sdk";
import OpenAI from "npm:openai";
import { kv } from "../../kv.js";

/* ================= AI CLIENTS ================= */
// Deno meng-cache eksekusi modul, sehingga variabel ini sudah bersifat singleton.
// Menghapus globalThis membuat kode lebih sederhana dan langsung.
const groqClient = new Groq({ apiKey: Deno.env.get("GROQ_API_KEY") });

const openrouterClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: Deno.env.get("OPENROUTER_API_KEY"),
  defaultHeaders: {
    "HTTP-Referer": Deno.env.get("SITE_URL") || "https://localhost",
    "X-Title": "FJRToolsBot",
  },
});

/* ================= CONFIG FETCHER ================= */
/**
 * @returns {Promise<{ provider: string, model: string }>}
 */
export async function getAIConfig() {
  try {
    const [providerRes, modelRes] = await Promise.all([
      kv.get(["ai_provider"], { cached: true }),
      kv.get(["ai_model"], { cached: true }),
    ]);

    return {
      provider: providerRes.value || "groq",
      model: modelRes.value || "qwen/qwen3-32b",
    };
  } catch (err) {
    console.error("[AIConfig] Error:", err instanceof Error ? err.message : String(err));
    return { provider: "groq", model: "qwen/qwen3-32b" };
  }
}

/* ================= AI REQUEST ================= */
/**
 * @param {Array} messages 
 * @returns {Promise<string>}
 */
export async function sendToAI(messages) {
  const config = await getAIConfig();
  const { provider, model } = config;

  try {
    const client = provider === "openrouter" ? openrouterClient : groqClient;

    const res = await client.chat.completions.create({
      model,
      messages,
      temperature: 1,
      max_tokens: 2048,
    });

    let content = res.choices?.[0]?.message?.content || "❌ No response.";

    // Cleanup: hapus tag <think> dan normalisasi heading markdown secara berantai
    content = content
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/^#{1,6}\s+\*\*(.+?)\s*\*\*\s*$/gm, "**$1**")
      .replace(/^#{1,6}\s+(.+)$/gm, "**$1**")
      .replace(/\*\*(.+?)\s+\*\*/g, "**$1**")
      .trim();

    return content;
  } catch (err) {
    const status = err?.status ?? err?.error?.status;
    const message = err?.message ?? "";

    console.error(`[${provider.toUpperCase()} ERROR]:`, err);

    if (status === 429) {
      const e = new Error("rate_limit");
      e.isRateLimit = true;
      throw e;
    }

    if (status === 413 || message.includes("maximum context length")) {
      const e = new Error("too_large");
      e.isTooLarge = true;
      throw e;
    }

    if (status === 401) {
      return "❌ API key salah atau tidak valid.";
    }

    return "❌ Gagal mengambil jawaban AI.";
  }
}