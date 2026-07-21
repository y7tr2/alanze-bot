import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const telegramUsersTable = pgTable("telegram_users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  username: text("username"),
  messageCount: integer("message_count").notNull().default(0),
  firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
});

export type TelegramUser = typeof telegramUsersTable.$inferSelect;
