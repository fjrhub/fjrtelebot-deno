export default (bot) => {
  bot.command("help", (ctx) => {
    const helpMessage = `*🤖 FJRToolsBot - AI Assistant & Utilities*

*📝 AI & Chat:*
• /ai <question> \- Interactive chat with AI
• /model \- Select available AI model
• /cekmodel \- View current active model
• /history \- Export chat history to JSON
• /reset \- Clear conversation history

*🛠️ Tools & Utility:*
• /github \- Get GitHub repository/user info
• /encrypt \- Encrypt text (security)
• /decrypt \- Decrypt secret text
• /ping \- Check bot response latency
• /tagall \- Mention all group members

*💰 Finance:*
• /btc \- Get latest Bitcoin price

*⚙️ System & Owner:*
• /start \- Start bot interaction
• /setver \- Set bot version (Admin)
• /resetver \- Reset bot version (Admin)
• /historyall \- View all logs (Owner)
• /resetall \- Clear all data (Owner)

*✨ Key Features:*
• *Dual-History:* Separate history for Private & Group chats
• *Auto-Trim:* Keeps memory usage efficient
• *Auto-Split:* Supports very long messages
• *Persistence:* Data safely stored in Cloud KV`;

    return ctx.reply(helpMessage, { parse_mode: "Markdown" });
  });
};