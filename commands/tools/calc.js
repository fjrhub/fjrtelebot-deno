export default (bot) => {
  bot.command("calc", async (ctx) => {
    try {
      // Use ctx.payload for Telegraf v4, fallback to ctx.match for v3
      const input = (ctx.payload || ctx.match)?.trim();

      if (!input) {
        return ctx.reply(
          "Usage examples:\n" +
          "/calc 25*12+100\n" +
          "/calc (50/2)+7\n" +
          "/calc 100.000+50.000\n" +
          "/calc 1,5*2"
        );
      }

      // Validate safe characters (digits, operators, parentheses, comma, percent, space, equals)
      if (!/^[0-9+\-*/().,%\s=]+$/.test(input)) {
        return ctx.reply("Only numbers and mathematical operators are allowed.");
      }

      // Prevent excessively long expressions to avoid performance issues
      if (input.length > 200) {
        return ctx.reply("Expression is too long.");
      }

      // Remove trailing '=' signs and trim whitespace
      let expression = input.replace(/=+\s*$/, "").trim();

      if (!expression) {
        return ctx.reply("Invalid calculation.");
      }

      // Normalize Indonesian number format:
      // - Dot (.) as thousands separator -> removed
      // - Comma (,) as decimal separator -> replaced with dot (.)
      expression = expression
        .replace(/\./g, '')      // Remove all dots
        .replace(/,/g, '.');     // Convert comma to dot

      // Evaluate the expression.
      // The strict regex validation above prevents code injection, 
      // making the Function constructor safe to use here without external libraries.
      const result = Function(`"use strict"; return (${expression})`)();

      if (result === undefined || Number.isNaN(result) || !Number.isFinite(result)) {
        return ctx.reply("Invalid calculation.");
      }

      // Format the result using Indonesian locale standards
      const formattedResult = Number(result).toLocaleString('id-ID', {
        maximumFractionDigits: 10
      });

      await ctx.reply(
        `🧮 Calculator\n\n` +
        `Expression: ${input}\n` +
        `Result: ${formattedResult}`
      );

    } catch (err) {
      console.error("Error in /calc command:", err);
      await ctx.reply("Failed to calculate. Please check your input format.");
    }
  });
};