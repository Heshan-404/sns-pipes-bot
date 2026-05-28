import { initTelegramBot } from "../src/gateways/telegram.js";

const bot = initTelegramBot();

export default async function handler(req: any, res: any) {
  if (req.method === "POST") {
    try {
      if (!bot) {
        res.status(500).send("Bot not initialized");
        return;
      }
      await bot.handleUpdate(req.body);
      if (!res.writableEnded) {
        res.status(200).send("OK");
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.status(200).send("Bot service is active");
  }
}
