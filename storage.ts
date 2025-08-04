import { 
  type ServerConfig, 
  type InsertServerConfig,
  type CustomCommand,
  type InsertCustomCommand,
  type ModerationLog,
  type InsertModerationLog,
  type Ticket,
  type InsertTicket,
  type UserWarning,
  type InsertUserWarning,
  type MessageLog,
  type InsertMessageLog,
  type User, 
  type InsertUser,
  serverConfigs,
  customCommands,
  moderationLogs,
  tickets,
  userWarnings,
  messageLogs,
  users
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

export interface IStorage {
  // Legacy user methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Server configuration methods
  getServerConfig(serverId: string): Promise<ServerConfig | undefined>;
  createServerConfig(config: InsertServerConfig): Promise<ServerConfig>;
  updateServerConfig(serverId: string, updates: Partial<InsertServerConfig>): Promise<ServerConfig>;

  // Custom command methods
  getCustomCommands(serverId: string): Promise<CustomCommand[]>;
  getCustomCommand(serverId: string, name: string): Promise<CustomCommand | undefined>;
  createCustomCommand(command: InsertCustomCommand): Promise<CustomCommand>;
  deleteCustomCommand(id: string): Promise<void>;

  // Moderation log methods
  getModerationLogs(serverId: string, limit?: number): Promise<ModerationLog[]>;
  createModerationLog(log: InsertModerationLog): Promise<ModerationLog>;

  // Ticket methods
  getTickets(serverId: string): Promise<Ticket[]>;
  getTicketByChannel(channelId: string): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, updates: Partial<InsertTicket>): Promise<Ticket>;

  // User warning methods
  getUserWarnings(serverId: string, userId: string): Promise<UserWarning[]>;
  createUserWarning(warning: InsertUserWarning): Promise<UserWarning>;

  // Message log methods
  getMessageLogs(serverId: string, limit?: number): Promise<MessageLog[]>;
  createMessageLog(log: InsertMessageLog): Promise<MessageLog>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getServerConfig(serverId: string): Promise<ServerConfig | undefined> {
    const [config] = await db.select().from(serverConfigs).where(eq(serverConfigs.id, serverId));
    return config || undefined;
  }

  async createServerConfig(config: InsertServerConfig): Promise<ServerConfig> {
    const configData = {
      ...config,
      welcomeChannelId: config.welcomeChannelId || null,
      welcomeMessage: config.welcomeMessage || null,
      goodbyeMessage: config.goodbyeMessage || null,
      autoRoleId: config.autoRoleId || null,
      moderationLogChannelId: config.moderationLogChannelId || null,
      announcementChannelId: config.announcementChannelId || null,
      ticketCategoryId: config.ticketCategoryId || null,
    };
    
    const [serverConfig] = await db
      .insert(serverConfigs)
      .values(configData)
      .returning();
    return serverConfig;
  }

  async updateServerConfig(serverId: string, updates: Partial<InsertServerConfig>): Promise<ServerConfig> {
    const updateData = {
      ...updates,
      welcomeChannelId: updates.welcomeChannelId || null,
      welcomeMessage: updates.welcomeMessage || null,
      goodbyeMessage: updates.goodbyeMessage || null,
      autoRoleId: updates.autoRoleId || null,
      moderationLogChannelId: updates.moderationLogChannelId || null,
      announcementChannelId: updates.announcementChannelId || null,
      ticketCategoryId: updates.ticketCategoryId || null,
      updatedAt: new Date()
    };
    
    const [updated] = await db
      .update(serverConfigs)
      .set(updateData)
      .where(eq(serverConfigs.id, serverId))
      .returning();
    return updated;
  }

  async getCustomCommands(serverId: string): Promise<CustomCommand[]> {
    return await db.select().from(customCommands).where(eq(customCommands.serverId, serverId));
  }

  async getCustomCommand(serverId: string, name: string): Promise<CustomCommand | undefined> {
    const [command] = await db
      .select()
      .from(customCommands)
      .where(eq(customCommands.serverId, serverId))
      .limit(1);
    
    const filtered = await db
      .select()
      .from(customCommands)
      .where(eq(customCommands.serverId, serverId));
    
    return filtered.find(cmd => cmd.name === name) || undefined;
  }

  async createCustomCommand(command: InsertCustomCommand): Promise<CustomCommand> {
    const commandData = {
      ...command,
      description: command.description || null,
    };
    
    const [created] = await db
      .insert(customCommands)
      .values(commandData)
      .returning();
    return created;
  }

  async deleteCustomCommand(id: string): Promise<void> {
    await db.delete(customCommands).where(eq(customCommands.id, id));
  }

  async getModerationLogs(serverId: string, limit = 50): Promise<ModerationLog[]> {
    return await db
      .select()
      .from(moderationLogs)
      .where(eq(moderationLogs.serverId, serverId))
      .orderBy(desc(moderationLogs.createdAt))
      .limit(limit);
  }

  async createModerationLog(log: InsertModerationLog): Promise<ModerationLog> {
    // Get the next case number for this server
    const existingLogs = await db
      .select({ caseNumber: moderationLogs.caseNumber })
      .from(moderationLogs)
      .where(eq(moderationLogs.serverId, log.serverId))
      .orderBy(desc(moderationLogs.caseNumber))
      .limit(1);
    
    const nextCaseNumber = existingLogs.length > 0 ? existingLogs[0].caseNumber + 1 : 1;
    
    const logData = {
      ...log,
      caseNumber: nextCaseNumber,
      reason: log.reason || null,
      duration: log.duration || null,
    };
    
    const [created] = await db
      .insert(moderationLogs)
      .values(logData)
      .returning();
    return created;
  }

  async getTickets(serverId: string): Promise<Ticket[]> {
    return await db.select().from(tickets).where(eq(tickets.serverId, serverId));
  }

  async getTicketByChannel(channelId: string): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.channelId, channelId));
    return ticket || undefined;
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const ticketData = {
      ...ticket,
      status: ticket.status || "open",
    };
    
    const [created] = await db
      .insert(tickets)
      .values(ticketData)
      .returning();
    return created;
  }

  async updateTicket(id: string, updates: Partial<InsertTicket>): Promise<Ticket> {
    const updateData: any = { ...updates };
    if (updates.status === "closed") {
      updateData.closedAt = new Date();
    }
    
    const [updated] = await db
      .update(tickets)
      .set(updateData)
      .where(eq(tickets.id, id))
      .returning();
    return updated;
  }

  async getUserWarnings(serverId: string, userId: string): Promise<UserWarning[]> {
    const allWarnings = await db
      .select()
      .from(userWarnings)
      .where(eq(userWarnings.serverId, serverId))
      .orderBy(desc(userWarnings.createdAt));
    
    return allWarnings.filter(warning => warning.userId === userId);
  }

  async createUserWarning(warning: InsertUserWarning): Promise<UserWarning> {
    const [created] = await db
      .insert(userWarnings)
      .values(warning)
      .returning();
    return created;
  }

  async getMessageLogs(serverId: string, limit = 100): Promise<MessageLog[]> {
    return await db
      .select()
      .from(messageLogs)
      .where(eq(messageLogs.serverId, serverId))
      .orderBy(desc(messageLogs.createdAt))
      .limit(limit);
  }

  async createMessageLog(log: InsertMessageLog): Promise<MessageLog> {
    const logData = {
      ...log,
      content: log.content || null,
    };
    
    const [created] = await db
      .insert(messageLogs)
      .values(logData)
      .returning();
    return created;
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private serverConfigs: Map<string, ServerConfig>;
  private customCommands: Map<string, CustomCommand[]>;
  private moderationLogs: Map<string, ModerationLog[]>;
  private tickets: Map<string, Ticket>;
  private userWarnings: Map<string, UserWarning[]>;
  private messageLogs: Map<string, MessageLog[]>;

  constructor() {
    this.users = new Map();
    this.serverConfigs = new Map();
    this.customCommands = new Map();
    this.moderationLogs = new Map();
    this.tickets = new Map();
    this.userWarnings = new Map();
    this.messageLogs = new Map();
    this.loadData();
  }

  private async loadData() {
    try {
      // Load server configs from file system
      const serverConfigPath = path.join(process.cwd(), "data", "servers.json");
      try {
        const data = await fs.readFile(serverConfigPath, "utf-8");
        const configs = JSON.parse(data);
        configs.forEach((config: ServerConfig) => {
          this.serverConfigs.set(config.id, config);
        });
      } catch (error) {
        // File doesn't exist, that's okay
      }
    } catch (error) {
      console.log("No existing data to load");
    }
  }

  private async saveServerConfigs() {
    try {
      const dataDir = path.join(process.cwd(), "data");
      await fs.mkdir(dataDir, { recursive: true });
      
      const configs = Array.from(this.serverConfigs.values());
      await fs.writeFile(
        path.join(dataDir, "servers.json"),
        JSON.stringify(configs, null, 2)
      );
    } catch (error) {
      console.error("Failed to save server configs:", error);
    }
  }

  // Legacy user methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Server configuration methods
  async getServerConfig(serverId: string): Promise<ServerConfig | undefined> {
    return this.serverConfigs.get(serverId);
  }

  async createServerConfig(config: InsertServerConfig): Promise<ServerConfig> {
    const serverConfig: ServerConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.serverConfigs.set(config.id, serverConfig);
    await this.saveServerConfigs();
    return serverConfig;
  }

  async updateServerConfig(serverId: string, updates: Partial<InsertServerConfig>): Promise<ServerConfig> {
    const existing = this.serverConfigs.get(serverId);
    if (!existing) {
      throw new Error("Server config not found");
    }
    
    const updated: ServerConfig = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.serverConfigs.set(serverId, updated);
    await this.saveServerConfigs();
    return updated;
  }

  // Custom command methods
  async getCustomCommands(serverId: string): Promise<CustomCommand[]> {
    return this.customCommands.get(serverId) || [];
  }

  async getCustomCommand(serverId: string, name: string): Promise<CustomCommand | undefined> {
    const commands = this.customCommands.get(serverId) || [];
    return commands.find(cmd => cmd.name === name);
  }

  async createCustomCommand(command: InsertCustomCommand): Promise<CustomCommand> {
    const id = randomUUID();
    const customCommand: CustomCommand = {
      ...command,
      id,
      createdAt: new Date(),
    };

    const commands = this.customCommands.get(command.serverId) || [];
    commands.push(customCommand);
    this.customCommands.set(command.serverId, commands);
    
    return customCommand;
  }

  async deleteCustomCommand(id: string): Promise<void> {
    for (const [serverId, commands] of this.customCommands.entries()) {
      const index = commands.findIndex((cmd: any) => cmd.id === id);
      if (index !== -1) {
        commands.splice(index, 1);
        this.customCommands.set(serverId, commands);
        break;
      }
    }
  }

  // Moderation log methods
  async getModerationLogs(serverId: string, limit = 50): Promise<ModerationLog[]> {
    const logs = this.moderationLogs.get(serverId) || [];
    return logs.slice(0, limit);
  }

  async createModerationLog(log: InsertModerationLog): Promise<ModerationLog> {
    const id = randomUUID();
    const moderationLog: ModerationLog = {
      ...log,
      id,
      createdAt: new Date(),
    };

    const logs = this.moderationLogs.get(log.serverId) || [];
    logs.unshift(moderationLog); // Add to beginning for chronological order
    this.moderationLogs.set(log.serverId, logs);
    
    return moderationLog;
  }

  // Ticket methods
  async getTickets(serverId: string): Promise<Ticket[]> {
    return Array.from(this.tickets.values()).filter(ticket => ticket.serverId === serverId);
  }

  async getTicketByChannel(channelId: string): Promise<Ticket | undefined> {
    return Array.from(this.tickets.values()).find(ticket => ticket.channelId === channelId);
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const id = randomUUID();
    const newTicket: Ticket = {
      ...ticket,
      id,
      createdAt: new Date(),
      closedAt: null,
    };

    this.tickets.set(id, newTicket);
    return newTicket;
  }

  async updateTicket(id: string, updates: Partial<InsertTicket>): Promise<Ticket> {
    const existing = this.tickets.get(id);
    if (!existing) {
      throw new Error("Ticket not found");
    }

    const updated: Ticket = {
      ...existing,
      ...updates,
      closedAt: updates.status === "closed" ? new Date() : existing.closedAt,
    };

    this.tickets.set(id, updated);
    return updated;
  }

  // User warning methods
  async getUserWarnings(serverId: string, userId: string): Promise<UserWarning[]> {
    const warnings = this.userWarnings.get(`${serverId}:${userId}`) || [];
    return warnings;
  }

  async createUserWarning(warning: InsertUserWarning): Promise<UserWarning> {
    const id = randomUUID();
    const userWarning: UserWarning = {
      ...warning,
      id,
      createdAt: new Date(),
    };

    const key = `${warning.serverId}:${warning.userId}`;
    const warnings = this.userWarnings.get(key) || [];
    warnings.push(userWarning);
    this.userWarnings.set(key, warnings);
    
    return userWarning;
  }

  // Message log methods
  async getMessageLogs(serverId: string, limit = 100): Promise<MessageLog[]> {
    const logs = this.messageLogs.get(serverId) || [];
    return logs.slice(0, limit);
  }

  async createMessageLog(log: InsertMessageLog): Promise<MessageLog> {
    const id = randomUUID();
    const messageLog: MessageLog = {
      ...log,
      id,
      createdAt: new Date(),
    };

    const logs = this.messageLogs.get(log.serverId) || [];
    logs.unshift(messageLog); // Add to beginning for chronological order
    this.messageLogs.set(log.serverId, logs);
    
    return messageLog;
  }
}

export const storage = new DatabaseStorage();
