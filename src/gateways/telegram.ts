import { Telegraf, Markup } from "telegraf";
import { handleUserMessage } from "../services/ai.js";
import * as dotenv from "dotenv";

dotenv.config({ override: true });


const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.warn("WARNING: TELEGRAM_BOT_TOKEN is missing. Telegram gateway will not be started.");
}

export function initTelegramBot(): Telegraf | null {
  if (!token) return null;

  const bot = new Telegraf(token);

  // Command handlers
  bot.start((ctx) => {
    ctx.reply(
      "Welcome to SNS Pipes & Fittings! I am your AI product assistant. Ask me about our pipes, fittings, tools, available sizes, brands, or any product we carry. I am here to help!",
      Markup.keyboard([
        ["What products do you have?"],
        ["Do you have PP-R Stop Valves?", "Tell me about your services"]
      ]).resize()
    );
  });

  bot.help((ctx) => {
    ctx.reply(
      "I am an automated product assistant for SNS Pipes & Fittings. You can ask me things like: 'Do you have PP-R pipes?', 'What sizes are available for the welding machine?', 'What brands do you carry?', or 'Tell me about the mold for machine.'"
    );
  });

  // Handle text messages
  bot.on("text", async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const text = ctx.message.text;

    try {
      await ctx.sendChatAction("typing");

      const replyMessage = await handleUserMessage(chatId, text);

      const metadataRegex = /\[METADATA:\s*image=(.*?)\s*\|\s*slug=(.*?)\s*\|\s*name=(.*?)\]/i;
      const match = replyMessage.match(metadataRegex);

      const isGreetingOrWelcome = replyMessage.includes("Welcome to SNS Pipes & Fittings") || replyMessage.includes("Welcome back!");

      if (match) {
        const imageUrl = match[1].trim();
        const slug = match[2].trim();
        const captionText = replyMessage.replace(metadataRegex, "").trim();

        await ctx.replyWithPhoto(imageUrl, {
          caption: captionText,
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            Markup.button.url("View on Website", `https://snspipes.com/products/detail/?slug=${slug}`),
          ]),
        });
      } else if (isGreetingOrWelcome) {
        await ctx.reply(replyMessage, {
          parse_mode: "Markdown",
          ...Markup.keyboard([
            ["What products do you have?"],
            ["Do you have PP-R Stop Valves?", "Tell me about your services"]
          ]).resize()
        });
      } else {
        await ctx.reply(replyMessage, { parse_mode: "Markdown" });
      }

    } catch (error) {
      console.error(`Telegram Bot encountered an error handling message from ${chatId}:`, error);
      await ctx.reply("I'm sorry, I had trouble processing that message. Please try again.");
    }
  });

  // Handle non-text messages (e.g., voice, stickers, images)
  bot.on("message", async (ctx) => {
    await ctx.reply("I can only read and reply to text questions at this moment. Please type a message!");
  });

  if (process.env.NODE_ENV !== "production") {
    bot.launch()
      .then(() => {
        console.log("Telegram Bot Gateway successfully started and listening for messages!");
      })
      .catch((err) => {
        console.error("Failed to start Telegram Bot Gateway:", err);
      });

    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
  }

  return bot;
}
