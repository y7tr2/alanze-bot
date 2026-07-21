import { Bot } from "grammy";
import { db } from "@workspace/db";
import { telegramUsersTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import { logger } from "./lib/logger";

export async function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const ownerId = process.env.TELEGRAM_OWNER_ID;

  if (!token) {
    logger.warn("TELEGRAM_BOT_TOKEN not set — bot will not start");
    return;
  }

  if (!ownerId) {
    logger.warn("TELEGRAM_OWNER_ID not set — owner commands disabled");
  }

  const bot = new Bot(token);

  // Track every user who sends a message
  bot.on("message", async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    try {
      await db
        .insert(telegramUsersTable)
        .values({
          telegramId: String(from.id),
          firstName: from.first_name,
          lastName: from.last_name ?? null,
          username: from.username ?? null,
          messageCount: 1,
        })
        .onConflictDoUpdate({
          target: telegramUsersTable.telegramId,
          set: {
            firstName: from.first_name,
            lastName: from.last_name ?? null,
            username: from.username ?? null,
            messageCount: sql`${telegramUsersTable.messageCount} + 1`,
            lastSeenAt: new Date(),
          },
        });
    } catch (err) {
      logger.error({ err }, "Failed to save user");
    }
  });

  // /users — owner only
  bot.command("users", async (ctx) => {
    const senderId = String(ctx.from?.id);

    if (!ownerId || senderId !== ownerId) {
      return; // silently ignore non-owners
    }

    try {
      const users = await db
        .select()
        .from(telegramUsersTable)
        .orderBy(sql`${telegramUsersTable.lastSeenAt} desc`);

      if (users.length === 0) {
        await ctx.reply("لا يوجد مستخدمين بعد.");
        return;
      }

      // Send in chunks of 30 to avoid message length limits
      const chunkSize = 30;
      for (let i = 0; i < users.length; i += chunkSize) {
        const chunk = users.slice(i, i + chunkSize);
        const lines = chunk.map((u, index) => {
          const num = i + index + 1;
          const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
          const username = u.username ? ` (@${u.username})` : "";
          const link = u.username
            ? `<a href="tg://user?id=${u.telegramId}">${name}</a>`
            : `<a href="tg://user?id=${u.telegramId}">${name}</a>`;
          return `${num}. ${link}${username}\n🆔 <code>${u.telegramId}</code> | 💬 ${u.messageCount} رسالة`;
        });

        const header =
          i === 0
            ? `👥 <b>المستخدمين (${users.length})</b>\n\n`
            : "";

        await ctx.reply(header + lines.join("\n\n"), {
          parse_mode: "HTML",
        });
      }
    } catch (err) {
      logger.error({ err }, "Failed to fetch users for owner command");
      await ctx.reply("حدث خطأ أثناء جلب البيانات.");
    }
  });

  bot.catch((err) => {
    logger.error({ err }, "Bot error");
  });

  // Run in background — never crash the HTTP server
  bot
    .start({ onStart: () => logger.info("Telegram bot started") })
    .catch((err) => logger.error({ err }, "Bot stopped unexpectedly"));
}
