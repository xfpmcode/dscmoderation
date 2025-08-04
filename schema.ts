import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Server configurations for the Discord bot
export const serverConfigs = pgTable("server_configs", {
  id: varchar("id").primaryKey(), // Discord server ID
  name: text("name").notNull(),
  welcomeChannelId: varchar("welcome_channel_id"),
  welcomeMessage: text("welcome_message"),
  goodbyeMessage: text("goodbye_message"),
  autoRoleId: varchar("auto_role_id"),
  moderationLogChannelId: varchar("moderation_log_channel_id"),
  announcementChannelId: varchar("announcement_channel_id"),
  ticketCategoryId: varchar("ticket_category_id"),
  moderatorRoleIds: text("moderator_role_ids").array().default([]),
  adminRoleIds: text("admin_role_ids").array().default([]),
  enableSpamProtection: boolean("enable_spam_protection").default(true),
  maxMessagesPerMinute: integer("max_messages_per_minute").default(10),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Custom commands
export const customCommands = pgTable("custom_commands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serverId: varchar("server_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  response: text("response").notNull(),
  createdBy: varchar("created_by").notNull(), // Discord user ID
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Moderation logs with case system
export const moderationLogs = pgTable("moderation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseNumber: integer("case_number").notNull(),
  serverId: varchar("server_id").notNull(),
  targetUserId: varchar("target_user_id").notNull(),
  moderatorUserId: varchar("moderator_user_id").notNull(),
  action: text("action").notNull(), // kick, ban, mute, warn, etc.
  reason: text("reason"),
  duration: integer("duration"), // for temporary actions (in minutes)
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Support tickets
export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serverId: varchar("server_id").notNull(),
  channelId: varchar("channel_id").notNull(),
  userId: varchar("user_id").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("open"), // open, closed
  createdAt: timestamp("created_at").default(sql`now()`),
  closedAt: timestamp("closed_at"),
});

// User warnings
export const userWarnings = pgTable("user_warnings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serverId: varchar("server_id").notNull(),
  userId: varchar("user_id").notNull(),
  moderatorId: varchar("moderator_id").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Message logs for moderation
export const messageLogs = pgTable("message_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serverId: varchar("server_id").notNull(),
  channelId: varchar("channel_id").notNull(),
  messageId: varchar("message_id").notNull(),
  userId: varchar("user_id").notNull(),
  content: text("content"),
  action: text("action").notNull(), // deleted, edited
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Schema exports
export const insertServerConfigSchema = createInsertSchema(serverConfigs).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCustomCommandSchema = createInsertSchema(customCommands).omit({
  id: true,
  createdAt: true,
});

export const insertModerationLogSchema = createInsertSchema(moderationLogs).omit({
  id: true,
  caseNumber: true,
  createdAt: true,
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  closedAt: true,
});

export const insertUserWarningSchema = createInsertSchema(userWarnings).omit({
  id: true,
  createdAt: true,
});

export const insertMessageLogSchema = createInsertSchema(messageLogs).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type InsertServerConfig = z.infer<typeof insertServerConfigSchema>;
export type ServerConfig = typeof serverConfigs.$inferSelect;

export type InsertCustomCommand = z.infer<typeof insertCustomCommandSchema>;
export type CustomCommand = typeof customCommands.$inferSelect;

export type InsertModerationLog = z.infer<typeof insertModerationLogSchema>;
export type ModerationLog = typeof moderationLogs.$inferSelect;

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

export type InsertUserWarning = z.infer<typeof insertUserWarningSchema>;
export type UserWarning = typeof userWarnings.$inferSelect;

export type InsertMessageLog = z.infer<typeof insertMessageLogSchema>;
export type MessageLog = typeof messageLogs.$inferSelect;

// Legacy user schema (keeping for compatibility)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
