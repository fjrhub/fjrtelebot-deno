import "jsr:@std/dotenv/load";
import { bot } from "./bot.js";
import { registerHandlers } from "./handler.js";

registerHandlers(bot);

const OWNER_ID = process.env.OWNER_ID;

console.log("Bot is running in polling mode...");

if (OWNER_ID) {
  try {
    await bot.api.sendMessage(
      OWNER_ID,
      "🚀 Service Status\n\nDeployment completed successfully.\nBot is online and operational.",
    );
  } catch (error) {
    console.error("Failed to notify owner:", error);
  }
}

await bot.start();
