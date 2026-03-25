import ping from "./commands/ping.js";
import ai from "./commands/ai.js";
import start from "./commands/start.js";
import history from "./commands/history.js";
import clearhistory from "./commands/clearhistory.js";

export const registerHandlers = (bot) => {
  ping(bot);
  ai(bot);
  start(bot);
  history(bot);
  clearhistory(bot);
};
