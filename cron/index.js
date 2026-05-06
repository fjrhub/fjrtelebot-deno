import { registerDailyCron } from "./daily.js";

export function registerCrons(bot) {
  registerDailyCron(bot);
}