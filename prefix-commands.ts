import { Message, GuildMember, TextChannel } from "discord.js";
import { createInfoEmbed, createModerationEmbed } from "../utils/embedBuilder";
import { storage } from "../../storage";
import { hasModeratorPermission, hasAdminPermission } from "../utils/permissions";

function getCustomResponse(username: string): string {
  if (username === "xfpm_") {
    // Randomize between "Yes Senpai" and "Yes Sensei"
    return Math.random() < 0.5 ? "Yes Senpai" : "Yes Sensei";
  } else if (username === "lzov" || username === "killxistcool") {
    return "Command executed successfully";
  }
  return "Command executed";
}

export async function handlePrefixCommand(message: Message) {
  if (!message.guild || message.author.bot) return;

  // Allow all users to use prefix commands (removed user restriction)

  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();

  if (!commandName) return;

  // First check for custom commands
  try {
    const customCmd = await storage.getCustomCommand(message.guild.id, commandName);
    if (customCmd) {
      await message.reply(customCmd.response);
      return;
    }
  } catch (error) {
    console.error("Error checking custom command:", error);
  }

  // Built-in prefix commands
  switch (commandName) {
    case "ping":
      await handlePingCommand(message);
      break;
    case "help":
      await handleHelpCommand(message);
      break;
    case "kick":
      await handleKickCommand(message, args);
      break;
    case "ban":
      await handleBanCommand(message, args);
      break;
    case "warn":
      await handleWarnCommand(message, args);
      break;
    case "mute":
      await handleMuteCommand(message, args);
      break;
    case "purge":
    case "clear":
      await handlePurgeCommand(message, args);
      break;
    case "dm":
      await handleDmCommand(message, args);
      break;
    case "say":
      await handleSayCommand(message, args);
      break;
    case "serverinfo":
      await handleServerInfoCommand(message);
      break;
    case "userinfo":
      await handleUserInfoCommand(message, args);
      break;
    case "announce":
      await handleAnnounceCommand(message, args);
      break;
    case "warnings":
      await handleWarningsCommand(message, args);
      break;
    case "case":
      await handleCaseCommand(message, args);
      break;
    case "uptime":
      await handleUptimeCommand(message);
      break;
    case "slowmode":
      await handleSlowmodeCommand(message, args);
      break;
    default:
      // Command not found, but don't reply to avoid spam
      break;
  }
}

async function handlePingCommand(message: Message) {
  const sent = await message.reply("🏓 Pinging...");
  const timeDiff = sent.createdTimestamp - message.createdTimestamp;
  
  const embed = createInfoEmbed("🏓 Pong!", [
    { name: "Latency", value: `${timeDiff}ms`, inline: true },
    { name: "API Ping", value: `${Math.round(message.client.ws.ping)}ms`, inline: true },
    { name: "Status", value: "Online ✅", inline: true },
  ]);

  const response = getCustomResponse(message.author.username);
  await sent.edit({ content: response, embeds: [embed] });
}

async function handleHelpCommand(message: Message) {
  const embed = createInfoEmbed("📋 Bot Commands", [
    { 
      name: "Moderation Commands", 
      value: "!kick @user [reason]\n!ban @user [reason]\n!warn @user [reason]\n!mute @user [time] [reason]\n!warnings @user", 
      inline: false 
    },
    { 
      name: "Utility Commands", 
      value: "!ping - Check bot latency\n!purge/!clear [amount] - Delete messages\n!help - Show this help\n!case [number] - Look up case\n!uptime - Bot uptime\n!slowmode [seconds] - Set channel slowmode", 
      inline: false 
    },
    { 
      name: "Information Commands", 
      value: "!serverinfo - Server information\n!userinfo [@user] - User information", 
      inline: false 
    },
    { 
      name: "Admin Commands", 
      value: "!say [message] - Make bot say something\n!dm @user [message] - Send DM\n!announce [message] - Send announcement", 
      inline: false 
    },
  ]);

  embed.setFooter({ text: "All commands use ! prefix" });
  
  const response = getCustomResponse(message.author.username);
  await message.reply({ content: response, embeds: [embed] });
}

async function handleKickCommand(message: Message, args: string[]) {
  if (!message.member) return;
  
  const hasPermission = await hasModeratorPermission(message.member, message.guild!.id);
  if (!hasPermission) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ You don't have permission to use this command. ${response}`);
  }

  const target = message.mentions.users.first();
  if (!target) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ Please mention a user to kick. ${response}`);
  }

  const reason = args.slice(1).join(" ") || "No reason provided";
  
  try {
    const member = await message.guild!.members.fetch(target.id);
    await member.kick(reason);
    
    // Log the action
    const moderationLog = await storage.createModerationLog({
      serverId: message.guild!.id,
      targetUserId: target.id,
      moderatorUserId: message.author.id,
      action: "kick",
      reason,
    });

    const embed = createModerationEmbed("👢 User Kicked", {
      target,
      moderator: message.author,
      reason,
      caseNumber: moderationLog.caseNumber,
      timestamp: true,
    });

    const response = getCustomResponse(message.author.username);
    await message.reply({ content: response, embeds: [embed] });
  } catch (error) {
    const response = getCustomResponse(message.author.username);
    await message.reply(`❌ Failed to kick user. Check permissions and try again. ${response}`);
  }
}

async function handleBanCommand(message: Message, args: string[]) {
  if (!message.member) return;
  
  const hasPermission = await hasAdminPermission(message.member, message.guild!.id);
  if (!hasPermission) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ You don't have permission to use this command. ${response}`);
  }

  const target = message.mentions.users.first();
  if (!target) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ Please mention a user to ban. ${response}`);
  }

  const reason = args.slice(1).join(" ") || "No reason provided";
  
  try {
    await message.guild!.members.ban(target, { reason });
    
    // Log the action
    const moderationLog = await storage.createModerationLog({
      serverId: message.guild!.id,
      targetUserId: target.id,
      moderatorUserId: message.author.id,
      action: "ban",
      reason,
    });

    const embed = createModerationEmbed("🔨 User Banned", {
      target,
      moderator: message.author,
      reason,
      caseNumber: moderationLog.caseNumber,
      timestamp: true,
    });

    const response = getCustomResponse(message.author.username);
    await message.reply({ content: response, embeds: [embed] });
  } catch (error) {
    const response = getCustomResponse(message.author.username);
    await message.reply(`❌ Failed to ban user. Check permissions and try again. ${response}`);
  }
}

async function handleWarnCommand(message: Message, args: string[]) {
  if (!message.member) return;
  
  const hasPermission = await hasModeratorPermission(message.member, message.guild!.id);
  if (!hasPermission) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ You don't have permission to use this command. ${response}`);
  }

  const target = message.mentions.users.first();
  if (!target) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ Please mention a user to warn. ${response}`);
  }

  const reason = args.slice(1).join(" ") || "No reason provided";
  
  try {
    // Create warning
    await storage.createUserWarning({
      serverId: message.guild!.id,
      userId: target.id,
      moderatorId: message.author.id,
      reason,
    });
    
    // Log the action
    const moderationLog = await storage.createModerationLog({
      serverId: message.guild!.id,
      targetUserId: target.id,
      moderatorUserId: message.author.id,
      action: "warn",
      reason,
    });

    const embed = createModerationEmbed("⚠️ User Warned", {
      target,
      moderator: message.author,
      reason,
      caseNumber: moderationLog.caseNumber,
      timestamp: true,
    });

    const response = getCustomResponse(message.author.username);
    await message.reply({ content: response, embeds: [embed] });
  } catch (error) {
    const response = getCustomResponse(message.author.username);
    await message.reply(`❌ Failed to warn user. ${response}`);
  }
}

async function handleMuteCommand(message: Message, args: string[]) {
  if (!message.member) return;
  
  const hasPermission = await hasModeratorPermission(message.member, message.guild!.id);
  if (!hasPermission) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ You don't have permission to use this command. ${response}`);
  }

  const target = message.mentions.users.first();
  if (!target) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ Please mention a user to mute. ${response}`);
  }

  const timeArg = args[1];
  const reason = args.slice(2).join(" ") || "No reason provided";
  
  // Parse time (default to 10 minutes)
  let duration = 10;
  if (timeArg) {
    const parsedTime = parseInt(timeArg);
    if (!isNaN(parsedTime)) {
      duration = Math.min(parsedTime, 60 * 24 * 28); // Max 28 days
    }
  }

  try {
    const member = await message.guild!.members.fetch(target.id);
    await member.timeout(duration * 60 * 1000, reason);
    
    // Log the action
    const moderationLog = await storage.createModerationLog({
      serverId: message.guild!.id,
      targetUserId: target.id,
      moderatorUserId: message.author.id,
      action: "timeout",
      reason,
      duration,
    });

    const embed = createModerationEmbed("🔇 User Muted", {
      target,
      moderator: message.author,
      reason,
      extra: `Duration: ${duration} minutes`,
      caseNumber: moderationLog.caseNumber,
      timestamp: true,
    });

    const response = getCustomResponse(message.author.username);
    await message.reply({ content: response, embeds: [embed] });
  } catch (error) {
    const response = getCustomResponse(message.author.username);
    await message.reply(`❌ Failed to mute user. Check permissions and try again. ${response}`);
  }
}

async function handlePurgeCommand(message: Message, args: string[]) {
  if (!message.member) return;
  
  const hasPermission = await hasModeratorPermission(message.member, message.guild!.id);
  if (!hasPermission) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ You don't have permission to use this command. ${response}`);
  }

  const amount = parseInt(args[0]);
  if (isNaN(amount) || amount < 1 || amount > 100) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ Please provide a number between 1 and 100. ${response}`);
  }

  try {
    if (!message.channel.isTextBased() || message.channel.isDMBased()) return;
    
    const messages = await message.channel.messages.fetch({ limit: amount + 1 });
    const messagesToDelete = Array.from(messages.values()).slice(1); // Exclude the command message
    
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const recentMessages = messagesToDelete.filter(msg => msg.createdTimestamp > twoWeeksAgo);

    if (recentMessages.length > 0 && message.channel instanceof TextChannel) {
      await message.channel.bulkDelete(recentMessages);
    }

    const response = getCustomResponse(message.author.username);
    const confirmMsg = await message.reply(`🧹 Deleted ${recentMessages.length} messages. ${response}`);
    
    // Delete the confirmation after 5 seconds
    setTimeout(() => {
      confirmMsg.delete().catch(() => {});
    }, 5000);
    
    // Delete the original command
    await message.delete().catch(() => {});
    
  } catch (error) {
    const response = getCustomResponse(message.author.username);
    await message.reply(`❌ Failed to delete messages. ${response}`);
  }
}

async function handleDmCommand(message: Message, args: string[]) {
  if (!message.member) return;
  
  const hasPermission = await hasModeratorPermission(message.member, message.guild!.id);
  if (!hasPermission) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ You don't have permission to use this command. ${response}`);
  }

  const target = message.mentions.users.first();
  if (!target) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ Please mention a user to DM. ${response}`);
  }

  const dmMessage = args.slice(1).join(" ");
  if (!dmMessage) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ Please provide a message to send. ${response}`);
  }

  try {
    const embed = createInfoEmbed("📩 Message from Server", [
      { name: "From", value: `${message.author.username} from ${message.guild!.name}`, inline: false },
      { name: "Message", value: dmMessage, inline: false },
    ]);

    await target.send({ embeds: [embed] });
    const response = getCustomResponse(message.author.username);
    await message.reply(`✅ Message sent to ${target.username}. ${response}`);
  } catch (error) {
    const response = getCustomResponse(message.author.username);
    await message.reply(`❌ Failed to send DM. User may have DMs disabled. ${response}`);
  }
}

async function handleSayCommand(message: Message, args: string[]) {
  if (!message.member) return;
  
  const hasPermission = await hasModeratorPermission(message.member, message.guild!.id);
  if (!hasPermission) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ You don't have permission to use this command. ${response}`);
  }

  const text = args.join(" ");
  if (!text) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ Please provide text for me to say. ${response}`);
  }

  try {
    await message.delete();
    const response = getCustomResponse(message.author.username);
    
    if (message.channel.isTextBased() && !message.channel.isDMBased()) {
      await message.channel.send(`${text} - ${response}`);
    }
  } catch (error) {
    const response = getCustomResponse(message.author.username);
    await message.reply(`❌ Failed to send message. ${response}`);
  }
}

async function handleServerInfoCommand(message: Message) {
  if (!message.guild) return;

  const guild = message.guild;
  const memberCount = guild.memberCount;
  const boostLevel = guild.premiumTier;
  const boostCount = guild.premiumSubscriptionCount;
  const createdAt = guild.createdAt.toLocaleDateString();

  const embed = createInfoEmbed("Server Information", [
    { name: "Server Name", value: guild.name, inline: true },
    { name: "Member Count", value: memberCount.toString(), inline: true },
    { name: "Created Date", value: createdAt, inline: true },
    { name: "Boost Level", value: boostLevel.toString(), inline: true },
    { name: "Boost Count", value: boostCount?.toString() || "0", inline: true },
    { name: "Server ID", value: guild.id, inline: true },
  ]);

  if (guild.iconURL()) {
    embed.setThumbnail(guild.iconURL()!);
  }

  const response = getCustomResponse(message.author.username);
  await message.reply({ content: response, embeds: [embed] });
}

async function handleUserInfoCommand(message: Message, args: string[]) {
  if (!message.guild) return;

  const targetUser = message.mentions.users.first() || message.author;
  
  try {
    const member = await message.guild.members.fetch(targetUser.id);
    const joinedAt = member.joinedAt?.toLocaleDateString() || "Unknown";
    const createdAt = targetUser.createdAt.toLocaleDateString();
    const roles = member.roles.cache
      .filter(role => role.name !== "@everyone")
      .map(role => role.name)
      .slice(0, 10)
      .join(", ") || "No roles";

    const embed = createInfoEmbed("User Information", [
      { name: "Username", value: targetUser.username, inline: true },
      { name: "Display Name", value: member.displayName, inline: true },
      { name: "User ID", value: targetUser.id, inline: true },
      { name: "Joined Server", value: joinedAt, inline: true },
      { name: "Account Created", value: createdAt, inline: true },
      { name: "Roles", value: roles, inline: false },
    ]);

    if (targetUser.avatarURL()) {
      embed.setThumbnail(targetUser.avatarURL()!);
    }

    const response = getCustomResponse(message.author.username);
    await message.reply({ content: response, embeds: [embed] });
  } catch (error) {
    const response = getCustomResponse(message.author.username);
    await message.reply(`❌ Failed to fetch user information. ${response}`);
  }
}

async function handleAnnounceCommand(message: Message, args: string[]) {
  if (!message.member) return;
  
  const hasPermission = await hasAdminPermission(message.member, message.guild!.id);
  if (!hasPermission) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ You don't have permission to use this command. ${response}`);
  }

  const announceText = args.join(" ");
  if (!announceText) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ Please provide an announcement message. ${response}`);
  }

  try {
    const embed = createModerationEmbed("📢 Announcement", {
      moderator: message.author,
      reason: announceText,
      timestamp: true,
    });

    if (message.channel.isTextBased() && !message.channel.isDMBased()) {
      await message.channel.send({ embeds: [embed] });
    }
    await message.delete().catch(() => {});
  } catch (error) {
    const response = getCustomResponse(message.author.username);
    await message.reply(`❌ Failed to send announcement. ${response}`);
  }
}

async function handleWarningsCommand(message: Message, args: string[]) {
  if (!message.member) return;
  
  const hasPermission = await hasModeratorPermission(message.member, message.guild!.id);
  if (!hasPermission) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ You don't have permission to use this command. ${response}`);
  }

  const target = message.mentions.users.first();
  if (!target) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ Please mention a user to check warnings for. ${response}`);
  }

  try {
    const warnings = await storage.getUserWarnings(message.guild!.id, target.id);

    if (warnings.length === 0) {
      const response = getCustomResponse(message.author.username);
      return message.reply(`${target.username} has no warnings. ${response}`);
    }

    const embed = createModerationEmbed("User Warnings", {
      target,
      extra: `Total warnings: ${warnings.length}`,
      warnings: warnings.slice(0, 10), // Show last 10 warnings
    });

    const response = getCustomResponse(message.author.username);
    await message.reply({ content: response, embeds: [embed] });
  } catch (error) {
    const response = getCustomResponse(message.author.username);
    await message.reply(`❌ Failed to fetch user warnings. ${response}`);
  }
}

async function handleCaseCommand(message: Message, args: string[]) {
  if (!message.guild) return;

  const caseNumber = parseInt(args[0]);
  if (isNaN(caseNumber)) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ Please provide a valid case number. ${response}`);
  }

  try {
    const logs = await storage.getModerationLogs(message.guild.id, 100);
    const caseLog = logs.find(log => log.caseNumber === caseNumber);

    if (!caseLog) {
      const response = getCustomResponse(message.author.username);
      return message.reply(`Case #${caseNumber} not found. ${response}`);
    }

    // Get user info
    const targetUser = await message.client.users.fetch(caseLog.targetUserId).catch(() => null);
    const moderator = await message.client.users.fetch(caseLog.moderatorUserId).catch(() => null);

    const embed = createModerationEmbed(`Case #${caseNumber} - ${caseLog.action.toUpperCase()}`, {
      target: targetUser || undefined,
      moderator: moderator || undefined,
      reason: caseLog.reason || "No reason provided",
      caseNumber: caseLog.caseNumber,
      extra: caseLog.duration ? `Duration: ${caseLog.duration} minutes` : undefined,
      timestamp: true,
    });

    embed.setFooter({ text: `Case created on ${caseLog.createdAt ? new Date(caseLog.createdAt).toLocaleString() : 'Unknown'}` });

    const response = getCustomResponse(message.author.username);
    await message.reply({ content: response, embeds: [embed] });
  } catch (error) {
    const response = getCustomResponse(message.author.username);
    await message.reply(`❌ Failed to fetch case information. ${response}`);
  }
}

async function handleUptimeCommand(message: Message) {
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  const embed = createInfoEmbed("⏰ Bot Uptime", [
    { name: "Uptime", value: `${days}d ${hours}h ${minutes}m ${seconds}s`, inline: false },
    { name: "Started", value: new Date(Date.now() - uptime * 1000).toLocaleString(), inline: false },
  ]);
  
  const response = getCustomResponse(message.author.username);
  await message.reply({ content: response, embeds: [embed] });
}

async function handleSlowmodeCommand(message: Message, args: string[]) {
  if (!message.member) return;
  
  const hasPermission = await hasModeratorPermission(message.member, message.guild!.id);
  if (!hasPermission) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ You don't have permission to use this command. ${response}`);
  }

  const slowmodeSeconds = parseInt(args[0]) || 0;
  if (slowmodeSeconds < 0 || slowmodeSeconds > 21600) {
    const response = getCustomResponse(message.author.username);
    return message.reply(`❌ Slowmode must be between 0 and 21600 seconds (6 hours). ${response}`);
  }

  try {
    if (!message.channel.isTextBased() || message.channel.isDMBased()) return;
    
    if (message.channel instanceof TextChannel) {
      await message.channel.setRateLimitPerUser(slowmodeSeconds, `Slowmode set by ${message.author.username}`);
      
      const embed = createModerationEmbed("🐌 Slowmode Updated", {
        moderator: message.author,
        reason: slowmodeSeconds === 0 ? "Slowmode disabled" : `Slowmode set to ${slowmodeSeconds} seconds`,
        timestamp: true,
      });
      
      const response = getCustomResponse(message.author.username);
      await message.reply({ content: response, embeds: [embed] });
    }
  } catch (error) {
    const response = getCustomResponse(message.author.username);
    await message.reply(`❌ Failed to set slowmode. ${response}`);
  }
}