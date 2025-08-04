import { GuildMember, PermissionFlagsBits } from "discord.js";
import { storage } from "../../storage";

export async function hasModeratorPermission(member: GuildMember, serverId: string): Promise<boolean> {
  // Check if user has administrator permission
  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  // Check if user has default moderation permissions
  if (member.permissions.has(PermissionFlagsBits.KickMembers) || 
      member.permissions.has(PermissionFlagsBits.BanMembers) ||
      member.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return true;
  }

  // Check custom moderator roles from server config
  try {
    const config = await storage.getServerConfig(serverId);
    if (config?.moderatorRoleIds.length > 0) {
      const hasModRole = member.roles.cache.some(role => 
        config.moderatorRoleIds.includes(role.id)
      );
      if (hasModRole) return true;
    }

    // Check admin roles from server config
    if (config?.adminRoleIds.length > 0) {
      const hasAdminRole = member.roles.cache.some(role => 
        config.adminRoleIds.includes(role.id)
      );
      if (hasAdminRole) return true;
    }
  } catch (error) {
    console.error("Error checking permissions:", error);
  }

  return false;
}

export async function hasAdminPermission(member: GuildMember, serverId: string): Promise<boolean> {
  // Check if user has administrator permission
  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  // Check custom admin roles from server config
  try {
    const config = await storage.getServerConfig(serverId);
    if (config?.adminRoleIds.length > 0) {
      const hasAdminRole = member.roles.cache.some(role => 
        config.adminRoleIds.includes(role.id)
      );
      if (hasAdminRole) return true;
    }
  } catch (error) {
    console.error("Error checking admin permissions:", error);
  }

  return false;
}

export function hasPermission(member: GuildMember, permission: bigint): boolean {
  return member.permissions.has(permission);
}
