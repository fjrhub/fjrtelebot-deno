// import { InputFile } from "npm:grammy";

// export default (bot) => {
//   bot.command("img", async (ctx) => {
//     try {
//       const text = ctx.message.text.trim();
//       const args = text.split(" ").slice(1);

//       if (!args.length) {
//         return;
//       }

//       const url = args[0];

//       try {
//         new URL(url);
//       } catch {
//         return;
//       }

//       const res = await fetch(url);

//       if (!res.ok) {
//         return;
//       }

//       const bytes = new Uint8Array(await res.arrayBuffer());

//       await ctx.replyWithPhoto(new InputFile(bytes, "image.png"));

//       // hapus pesan command pengirim
//       await ctx.deleteMessage().catch(() => {});
//     } catch (err) {
//       console.error(err);
//     }
//   });
// };
