import ping from "./commands/ping.js";
import start from "./commands/start.js";
import history from "./commands/ai-chat/history.js";
import reset from "./commands/ai-chat/reset.js";
import ai from "./commands/ai-chat/ai.js";
import cekmodel from "./commands/ai-chat/cekmodel.js";
import model from "./commands/ai-chat/model.js";

export const registerHandlers = (bot) => {
  ping(bot);
  start(bot);
  history(bot);
  reset(bot);
  model(bot);
  cekmodel(bot);
  ai(bot);
};
