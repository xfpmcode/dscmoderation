import { Client, Events, Message, Collection } from "discord.js";
import { storage } from "../../storage";
import { handleAntiSpam } from "./antiSpam";
import { handlePrefixCommand } from "../commands/prefix-commands";

// Spam protection tracking
const userMessageCounts = new Collection<string, { count: number; timestamp: number }>();

export function setupMessageEvents(client: Client) {
  // Message create event for spam protection and custom commands
  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot || !message.guild) return;

    try {
      const config = await storage.getServerConfig(message.guild.id);
      
      if (!config) return;

      // Spam protection
      if (config.enableSpamProtection) {
        await handleSpamProtection(message, config.maxMessagesPerMinute);
      }

      // Handle prefix commands with !
      if (message.content.startsWith("!")) {
        await handlePrefixCommand(message);
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });

  // Message delete event for logging
  client.on(Events.MessageDelete, async (message: Message) => {
    if (message.author?.bot || !message.guild) return;

    try {
      await storage.createMessageLog({
        serverId: message.guild.id,
        channelId: message.channel.id,
        messageId: message.id,
        userId: message.author.id,
        content: message.content || "No content",
        action: "deleted",
      });
    } catch (error) {
      console.error("Error logging deleted message:", error);
    }
  });

  // Message edit event for logging
  client.on(Events.MessageUpdate, async (oldMessage: Message, newMessage: Message) => {
    if (newMessage.author?.bot || !newMessage.guild) return;

    try {
      await storage.createMessageLog({
        serverId: newMessage.guild.id,
        channelId: newMessage.channel.id,
        messageId: newMessage.id,
        userId: newMessage.author.id,
        content: `Old: ${oldMessage.content || "No content"} | New: ${newMessage.content || "No content"}`,
        action: "edited",
      });
    } catch (error) {
      console.error("Error logging edited message:", error);
    }
  });
}

async function handleSpamProtection(message: Message, maxMessagesPerMinute: number) {
  const userId = message.author.id;
  const currentTime = Date.now();
  const timeWindow = 60000; // 1 minute in milliseconds

  const userStats = userMessageCounts.get(userId);
  
  if (!userStats || currentTime - userStats.timestamp > timeWindow) {
    // Reset or initialize user stats
    userMessageCounts.set(userId, { count: 1, timestamp: currentTime });
    return;
  }

  userStats.count++;

  if (userStats.count > maxMessagesPerMinute) {
    // User is spamming, take action
    try {
      await message.delete();
      
      // Timeout user for 5 minutes
      const member = await message.guild!.members.fetch(userId);
      if (member) {
        await member.timeout(5 * 60 * 1000, "Spam detected");
        
        // Log the action
        await storage.createModerationLog({
          serverId: message.guild!.id,
          targetUserId: userId,
          moderatorUserId: message.client.user!.id,
          action: "timeout",
          reason: "Automatic spam protection",
          duration: 5,
        });

        const warningMessage = await message.channel.send(
          `${message.author}, you have been timed out for 5 minutes due to spam detection.`
        );

        // Delete the warning message after 10 seconds
        setTimeout(() => {
          warningMessage.delete().catch(() => {});
        }, 10000);
      }
    } catch (error) {
      console.error("Error handling spam:", error);
    }
  }
}


