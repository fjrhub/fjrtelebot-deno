import { askAI } from "./core.js";

/* ================= FORMAT ================= */
function splitMessage(text, limit = 4000) {
  const chunks = [];

  while (text.length > limit) {
    let idx = text.lastIndexOf("\n\n", limit);

    if (idx === -1) idx = text.lastIndexOf("\n", limit);
    if (idx === -1) idx = text.lastIndexOf(" ", limit);
    if (idx === -1) idx = limit;

    chunks.push(text.slice(0, idx).trim());
    text = text.slice(idx).trim();
  }

  if (text.length) chunks.push(text);

  return chunks;
}

function escapeMarkdownV2(text) {
  return text.replace(/([_*[\]()~`>#+=|{}.!\\-])/g, "\\$1");
}

function convertToMarkdownV2(text) {
  const segments = [];

  const regex =
    /```[\s\S]*?```|`[^`]+`|\*\*(.+?)\*\*|__(.+?)__|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)|\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g;

  let last = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      segments.push(
        escapeMarkdownV2(text.slice(last, match.index)),
      );
    }

    const [full, b1, b2, i1, i2, lt, url] = match;

    // codeblock
    if (full.startsWith("```")) {
      segments.push(
        "```" +
          full.slice(3, -3).replace(/`/g, "\\`") +
          "```",
      );
    }

    // inline code
    else if (full.startsWith("`")) {
      segments.push(
        "`" +
          full.slice(1, -1).replace(/`/g, "\\`") +
          "`",
      );
    }

    // bold
    else if (b1 || b2) {
      segments.push(
        "*" + escapeMarkdownV2(b1 || b2) + "*",
      );
    }

    // italic
    else if (i1 || i2) {
      segments.push(
        "_" + escapeMarkdownV2(i1 || i2) + "_",
      );
    }

    // link
    else if (lt && url) {
      segments.push(
        `[${escapeMarkdownV2(lt)}](${url.replace(/[)]/g, "\\)")})`,
      );
    }

    else {
      segments.push(escapeMarkdownV2(full));
    }

    last = match.index + full.length;
  }

  if (last < text.length) {
    segments.push(
      escapeMarkdownV2(text.slice(last)),
    );
  }

  return segments.join("");
}

/* ================= SEND MESSAGE ================= */
export async function sendAIMessage(ctx, prompt) {
  await ctx.replyWithChatAction("typing");

  try {
    let reply = await askAI(prompt);

    // hapus think tag
    reply = reply
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .trim();

    // ubah heading markdown jadi bold
    reply = reply.replace(
      /^#{1,6}\s+(.+)$/gm,
      "**$1**",
    );

    for (const chunk of splitMessage(reply)) {
      try {
        const converted = convertToMarkdownV2(chunk);

        await ctx.reply(converted, {
          parse_mode: "MarkdownV2",
          disable_web_page_preview: true,
        });
      } catch {
        await ctx.reply(chunk, {
          disable_web_page_preview: true,
        });
      }
    }
  } catch (err) {
    console.error("AI ERROR:", err);

    await ctx.reply("❌ Gagal mengambil jawaban AI.");
  }
}