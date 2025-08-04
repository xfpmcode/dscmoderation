import { EmbedBuilder, User } from "discord.js";

export function createModerationEmbed(
  title: string, 
  options: {
    target?: User;
    moderator?: User;
    reason?: string;
    extra?: string;
    server?: string;
    warnings?: any[];
    timestamp?: boolean;
    caseNumber?: number;
  }
) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0xff6b6b)
    .setTimestamp(options.timestamp ? new Date() : null);

  if (options.caseNumber) {
    embed.addFields({ name: "Case #", value: `${options.caseNumber}`, inline: true });
  }

  if (options.target) {
    embed.addFields({ name: "User", value: `${options.target.username} (${options.target.id})`, inline: true });
  }

  if (options.moderator) {
    embed.addFields({ name: "Moderator", value: `${options.moderator.username}`, inline: true });
  }

  if (options.reason) {
    embed.addFields({ name: "Reason", value: options.reason, inline: false });
  }

  if (options.extra) {
    embed.addFields({ name: "Additional Info", value: options.extra, inline: false });
  }

  if (options.server) {
    embed.addFields({ name: "Server", value: options.server, inline: true });
  }

  if (options.warnings && options.warnings.length > 0) {
    const warningText = options.warnings
      .map((w, i) => `${i + 1}. ${w.reason} (${new Date(w.createdAt).toLocaleDateString()})`)
      .join("\n");
    embed.addFields({ name: "Recent Warnings", value: warningText, inline: false });
  }

  return embed;
}

export function createInfoEmbed(title: string, fields: { name: string; value: string; inline?: boolean }[]) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0x4facfe)
    .setTimestamp();

  fields.forEach(field => {
    embed.addFields({ name: field.name, value: field.value, inline: field.inline || false });
  });

  return embed;
}

export function createWelcomeEmbed(title: string, message: string, user: User) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(message)
    .setColor(0x00ff88)
    .setThumbnail(user.avatarURL())
    .setTimestamp();

  return embed;
}

export function createErrorEmbed(title: string, message: string) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(message)
    .setColor(0xff4757)
    .setTimestamp();
}

export function createSuccessEmbed(title: string, message: string) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(message)
    .setColor(0x2ed573)
    .setTimestamp();
}
