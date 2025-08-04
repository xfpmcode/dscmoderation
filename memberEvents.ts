import { Client, Events, GuildMember } from "discord.js";
import { storage } from "../../storage";
import { createWelcomeEmbed } from "../utils/embedBuilder";

export function setupMemberEvents(client: Client) {
  // Member join event
  client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
    try {
      const config = await storage.getServerConfig(member.guild.id);
      
      if (!config) {
        return; // No configuration for this server
      }

      // Auto-role assignment
      if (config.autoRoleId) {
        try {
          const role = member.guild.roles.cache.get(config.autoRoleId);
          if (role) {
            await member.roles.add(role);
            console.log(`Assigned auto-role ${role.name} to ${member.user.username}`);
          }
        } catch (error) {
          console.error("Failed to assign auto-role:", error);
        }
      }

      // Welcome message
      if (config.welcomeChannelId && config.welcomeMessage) {
        try {
          const welcomeChannel = member.guild.channels.cache.get(config.welcomeChannelId);
          if (welcomeChannel?.isTextBased()) {
            // Replace placeholders in welcome message
            let message = config.welcomeMessage
              .replace("{user}", `<@${member.user.id}>`)
              .replace("{username}", member.user.username)
              .replace("{server}", member.guild.name)
              .replace("{membercount}", member.guild.memberCount.toString());

            const embed = createWelcomeEmbed("Welcome!", message, member.user);
            await welcomeChannel.send({ embeds: [embed] });
          }
        } catch (error) {
          console.error("Failed to send welcome message:", error);
        }
      }
    } catch (error) {
      console.error("Error handling member join:", error);
    }
  });

  // Member leave event
  client.on(Events.GuildMemberRemove, async (member: GuildMember) => {
    try {
      const config = await storage.getServerConfig(member.guild.id);
      
      if (!config || !config.welcomeChannelId || !config.goodbyeMessage) {
        return;
      }

      const goodbyeChannel = member.guild.channels.cache.get(config.welcomeChannelId);
      if (goodbyeChannel?.isTextBased()) {
        // Replace placeholders in goodbye message
        let message = config.goodbyeMessage
          .replace("{user}", member.user.username)
          .replace("{username}", member.user.username)
          .replace("{server}", member.guild.name)
          .replace("{membercount}", member.guild.memberCount.toString());

        const embed = createWelcomeEmbed("Goodbye", message, member.user);
        await goodbyeChannel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error("Error handling member leave:", error);
    }
  });
}
