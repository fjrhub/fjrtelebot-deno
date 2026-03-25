import ping from "./commands/ping.js";
import halo from "./commands/halo.js";
import start from "./commands/start.js";
import history from "./commands/history.js";
import clearhistory from "./commands/clearhistory.js";

export const registerHandlers = (bot) => {
  ping(bot);
  halo(bot);
  start(bot);
  history(bot);
  clearhistory(bot);
};
