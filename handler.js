import ping from "./commands/ping.js";
import halo from "./commands/halo.js";
import start from "./commands/start.js";

export const registerHandlers = (bot) => {
  ping(bot);
  halo(bot);
  start(bot);
};
