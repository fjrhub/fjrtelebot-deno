# FJRToolsBot

> A modular Telegram bot built with **Deno** and **Grammy** — designed for AI-powered conversations, secure automation, and utility tools.

[![Deno](https://img.shields.io/badge/Deno-2.9+-black?logo=deno)](https://deno.land)
[![Grammy](https://img.shields.io/badge/Grammy-latest-green?logo=telegram)](https://grammy.dev)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Features

- **AI Chat** — Interact with AI via Groq API with multi-model support
- **Dual History** — Separate conversation history for private and group contexts
- **Auto-Trim & Auto-Split** — Efficient memory management with long message support
- **Persistent Storage** — Secure data persistence using Deno KV (Cloud)
- **Modular Commands** — Organized command structure by category
- **Owner-Only Commands** — Secure administrative controls

---

## Commands

### AI & Chat

| Command | Description |
|---------|-------------|
| `/ai` | Interactive chat with AI |
| `/model` | Select AI model |
| `/cekmodel` | Check active AI model |
| `/history` | Export chat history as JSON |
| `/reset` | Clear conversation history |

### Tools & Utilities

| Command | Description |
|---------|-------------|
| `/github <user/repo>` | Fetch GitHub repository or user info |
| `/encrypt <text>` | Encrypt text |
| `/decrypt <code>` | Decrypt encrypted text |
| `/ping` | Check bot latency |
| `/tagall` | Mention all group members *(admin only)* |
| `/calc <expression>` | Evaluate math expressions |
| `/qr <text>` | Generate QR code |
| `/format` | Format text using Markdown |

### Crypto

| Command | Description |
|---------|-------------|
| `/btc` | Fetch current Bitcoin price |

### System & Owner

| Command | Description | Access |
|---------|-------------|--------|
| `/start` | Start the bot | Public |
| `/setver <version>` | Set bot version | Admin |
| `/resetver` | Reset bot version to default | Admin |
| `/historyall` | View all system logs | Owner |
| `/resetall` | Clear all Deno KV data | Owner |

---

## Getting Started

### Prerequisites

- [Deno](https://deno.land/#installation) v2.9+
- Telegram Bot Token from [@BotFather](https://t.me/BotFather)
- Groq API Key from [console.groq.com](https://console.groq.com)

### 1. Clone the Repository

```bash
git clone https://github.com/fjrhub/fjrtelebot-deno.git
cd fjrtelebot-deno
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
TOKEN=your_telegram_bot_token_here
GROQ_API_KEY=your_groq_api_key_here
OWNER_ID=123456789
```

| Variable | Description | Required |
|----------|-------------|----------|
| `TOKEN` | Telegram Bot Token | ✅ |
| `GROQ_API_KEY` | Groq API Key for AI features | ✅ |
| `OWNER_ID` | Telegram User ID of the owner | ✅ |

### 3. Run the Bot

**Development (Polling):**

```bash
deno task dev
```

**Production (Webhook):**

```bash
deno task start
```

> Required flags: `--unstable-kv`, `--allow-net`, `--allow-env`, `--allow-read=.env`

---

## Project Structure

```
fjrtelebot-deno/
├── commands/
│   ├── ai-chat/     # ai.js, model.js, history.js, reset.js, cekmodel.js
│   ├── crypto/      # btc.js
│   ├── owner/       # historyall.js, resetall.js
│   └── tools/       # ping.js, github.js, tagall.js, calc.js, qr.js, etc.
├── config/          # Additional configuration
├── bot.js           # Grammy bot instance
├── dev.js           # Polling entry point (development)
├── handler.js       # Command handler registration
├── index.js         # Webhook entry point (production)
├── kv.js            # Global Deno KV instance
├── .env.example     # Environment variables template
└── deno.json        # Deno config and tasks
```

---

## Adding a New Command

1. Create a file in `commands/<category>/<command_name>.js`:

```js
// commands/tools/example.js
export default (bot) => {
  bot.command("example", (ctx) => {
    return ctx.reply("Hello from example command!");
  });
};
```

2. Register it in `handler.js`:

```js
import example from "./commands/tools/example.js";
example(bot);
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push: `git push origin feat/your-feature`
5. Open a Pull Request

> Commit messages must follow **Conventional Commits** format in English.
> Examples: `feat(ai): add model switching`, `fix(tagall): escape markdown chars`

---

## License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

## Author

**fjrhub**
- GitHub: [@fjrhub](https://github.com/fjrhub)

---

> ⭐ Found this useful? Give the repo a star!
