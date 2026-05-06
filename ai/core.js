import Groq from "npm:groq-sdk";
import { kv } from "../../kv.js";

const groq = globalThis._groq ?? new Groq({ apiKey: Deno.env.get("GROQ_API_KEY") });
globalThis._groq = groq;

export async function askAI(prompt) {
  try {
    const res = await groq.chat.completions.create({
      model: "qwen/qwen3-32b",
      messages: [
        {
          role: "system",
          content: "Kamu AI yang jawab singkat, jelas, bahasa Indonesia.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 1,
      max_tokens: 1024,
    });

    return res.choices?.[0]?.message?.content || "❌ No response.";
  } catch (err) {
    console.error("AI error:", err);
    return "❌ Gagal ambil jawaban AI.";
  }
}