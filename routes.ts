import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertServerConfigSchema, insertCustomCommandSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Server configuration routes
  app.get("/api/servers/:serverId/config", async (req, res) => {
    try {
      const { serverId } = req.params;
      const config = await storage.getServerConfig(serverId);
      
      if (!config) {
        return res.status(404).json({ message: "Server configuration not found" });
      }
      
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to get server configuration" });
    }
  });

  app.post("/api/servers/:serverId/config", async (req, res) => {
    try {
      const { serverId } = req.params;
      const configData = { ...req.body, id: serverId };
      
      const validatedConfig = insertServerConfigSchema.parse(configData);
      
      const existing = await storage.getServerConfig(serverId);
      let config;
      
      if (existing) {
        config = await storage.updateServerConfig(serverId, validatedConfig);
      } else {
        config = await storage.createServerConfig(validatedConfig);
      }
      
      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid configuration data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save server configuration" });
    }
  });

  // Custom commands routes
  app.get("/api/servers/:serverId/commands", async (req, res) => {
    try {
      const { serverId } = req.params;
      const commands = await storage.getCustomCommands(serverId);
      res.json(commands);
    } catch (error) {
      res.status(500).json({ message: "Failed to get custom commands" });
    }
  });

  app.post("/api/servers/:serverId/commands", async (req, res) => {
    try {
      const { serverId } = req.params;
      const commandData = { ...req.body, serverId };
      
      const validatedCommand = insertCustomCommandSchema.parse(commandData);
      const command = await storage.createCustomCommand(validatedCommand);
      
      res.json(command);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid command data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create custom command" });
    }
  });

  app.delete("/api/commands/:commandId", async (req, res) => {
    try {
      const { commandId } = req.params;
      await storage.deleteCustomCommand(commandId);
      res.json({ message: "Command deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete command" });
    }
  });

  // Moderation logs routes
  app.get("/api/servers/:serverId/logs/moderation", async (req, res) => {
    try {
      const { serverId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getModerationLogs(serverId, limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get moderation logs" });
    }
  });

  // Message logs routes
  app.get("/api/servers/:serverId/logs/messages", async (req, res) => {
    try {
      const { serverId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getMessageLogs(serverId, limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get message logs" });
    }
  });

  // Tickets routes
  app.get("/api/servers/:serverId/tickets", async (req, res) => {
    try {
      const { serverId } = req.params;
      const tickets = await storage.getTickets(serverId);
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ message: "Failed to get tickets" });
    }
  });

  // User warnings routes
  app.get("/api/servers/:serverId/warnings/:userId", async (req, res) => {
    try {
      const { serverId, userId } = req.params;
      const warnings = await storage.getUserWarnings(serverId, userId);
      res.json(warnings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user warnings" });
    }
  });

  // Bot status route
  app.get("/api/bot/status", async (req, res) => {
    try {
      const { bot } = await import("./bot/index");
      const isOnline = bot?.isReady() || false;
      const serverCount = bot?.guilds.cache.size || 0;
      
      res.json({
        online: isOnline,
        serverCount,
        uptime: bot?.uptime || 0,
      });
    } catch (error) {
      res.json({
        online: false,
        serverCount: 0,
        uptime: 0,
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
