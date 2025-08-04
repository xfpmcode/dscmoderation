import { Message, GuildMember } from "discord.js";
import { storage } from "../../storage";

// Track user messages for spam detection
const userMessages = new Map<string, Message[]>();
const userWarnings = new Map<string, number>();

export async function handleAntiSpam(message: Message) {
  if (!message.guild || message.author.bot) return;

  const config = await storage.getServerConfig(message.guild.id);
  if (!config?.enableSpamProtection) return;

  const userId = message.author.id;
  const maxMessages = config.maxMessagesPerMinute || 10;
  const timeWindow = 60000; // 1 minute

  // Get user's recent messages
  if (!userMessages.has(userId)) {
    userMessages.set(userId, []);
  }

  const messages = userMessages.get(userId)!;
  const now = Date.now();

  // Remove old messages outside time window
  const recentMessages = messages.filter(msg => (now - msg.createdTimestamp) < timeWindow);
  recentMessages.push(message);
  userMessages.set(userId, recentMessages);

  // Check if user is spamming
  if (recentMessages.length > maxMessages) {
    await handleSpamDetection(message, recentMessages.length);
  }
}

async function handleSpamDetection(message: Message, messageCount: number) {
  const userId = message.author.id;
  const warnings = userWarnings.get(userId) || 0;

  try {
    if (warnings === 0) {
      // First warning - delete messages and warn
      await deleteRecentMessages(message, 5);
      userWarnings.set(userId, 1);
      
      await message.channel.send(`${message.author}, please slow down your messages. Warning 1/3`);
      
      // Log the action
      await storage.createModerationLog({
        serverId: message.guild!.id,
        targetUserId: userId,
        moderatorUserId: message.client.user!.id,
        action: "warn",
        reason: `Auto-moderation: Spam detected (${messageCount} messages/minute)`,
      });

    } else if (warnings === 1) {
      // Second warning - timeout for 5 minutes
      await deleteRecentMessages(message, 10);
      userWarnings.set(userId, 2);
      
      const member = message.member as GuildMember;
      await member.timeout(5 * 60 * 1000, "Auto-moderation: Repeated spam");
      
      await message.channel.send(`${message.author} has been timed out for 5 minutes due to continued spam. Warning 2/3`);
      
      await storage.createModerationLog({
        serverId: message.guild!.id,
        targetUserId: userId,
        moderatorUserId: message.client.user!.id,
        action: "timeout",
        reason: `Auto-moderation: Repeated spam (${messageCount} messages/minute)`,
        duration: 5,
      });

    } else {
      // Third strike - kick user
      await deleteRecentMessages(message, 15);
      userWarnings.delete(userId);
      
      const member = message.member as GuildMember;
      await member.kick("Auto-moderation: Excessive spam (3 strikes)");
      
      await message.channel.send(`${message.author.username} has been kicked for excessive spam.`);
      
      await storage.createModerationLog({
        serverId: message.guild!.id,
        targetUserId: userId,
        moderatorUserId: message.client.user!.id,
        action: "kick",
        reason: `Auto-moderation: Excessive spam (${messageCount} messages/minute, 3 strikes)`,
      });
    }
  } catch (error) {
    console.error("Error handling spam detection:", error);
  }
}

async function deleteRecentMessages(message: Message, count: number) {
  try {
    const messages = await message.channel.messages.fetch({ limit: count });
    const userMessages = messages.filter(msg => msg.author.id === message.author.id);
    
    for (const msg of userMessages.values()) {
      try {
        await msg.delete();
      } catch (error) {
        console.error("Failed to delete message:", error);
      }
    }
  } catch (error) {
    console.error("Error deleting messages:", error);
  }
}

// Clean up old data every 5 minutes
setInterval(() => {
  const now = Date.now();
  const timeWindow = 60000;

  for (const [userId, messages] of userMessages.entries()) {
    const recentMessages = messages.filter(msg => (now - msg.createdTimestamp) < timeWindow);
    if (recentMessages.length === 0) {
      userMessages.delete(userId);
    } else {
      userMessages.set(userId, recentMessages);
    }
  }

  // Reset warnings after 1 hour
  for (const [userId, _] of userWarnings.entries()) {
    userWarnings.delete(userId);
  }
}, 5 * 60 * 1000);