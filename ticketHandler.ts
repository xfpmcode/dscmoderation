import { Client, Events, ButtonInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } from "discord.js";
import { storage } from "../../storage";
import { createInfoEmbed } from "../utils/embedBuilder";

export function setupTicketHandler(client: Client) {
  // Handle ticket button interactions
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === "create_ticket") {
      await handleCreateTicket(interaction);
    } else if (interaction.customId === "close_ticket") {
      await handleCloseTicket(interaction);
    }
  });
}

async function handleCreateTicket(interaction: ButtonInteraction) {
  if (!interaction.guild || !interaction.member) {
    return interaction.reply({ content: "This feature can only be used in a server.", ephemeral: true });
  }

  try {
    const config = await storage.getServerConfig(interaction.guild.id);
    
    if (!config?.ticketCategoryId) {
      return interaction.reply({ content: "Ticket system is not configured for this server.", ephemeral: true });
    }

    // Check if user already has an open ticket
    const existingTickets = await storage.getTickets(interaction.guild.id);
    const userTicket = existingTickets.find(ticket => 
      ticket.userId === interaction.user.id && ticket.status === "open"
    );

    if (userTicket) {
      return interaction.reply({ 
        content: `You already have an open ticket: <#${userTicket.channelId}>`, 
        ephemeral: true 
      });
    }

    // Create ticket channel
    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: config.ticketCategoryId,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
        {
          id: interaction.client.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
      ],
    });

    // Add moderator role permissions if configured
    if (config.moderatorRoleIds.length > 0) {
      for (const roleId of config.moderatorRoleIds) {
        await ticketChannel.permissionOverwrites.create(roleId, {
          ViewChannel: true,
          SendMessages: true,
        });
      }
    }

    // Create ticket record
    await storage.createTicket({
      serverId: interaction.guild.id,
      channelId: ticketChannel.id,
      userId: interaction.user.id,
      subject: "General Support",
      status: "open",
    });

    // Create close button
    const closeButton = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("Close Ticket")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🔒")
      );

    // Send welcome message to ticket channel
    const embed = createInfoEmbed("Support Ticket Created", [
      { name: "User", value: `<@${interaction.user.id}>`, inline: true },
      { name: "Status", value: "Open", inline: true },
      { name: "Instructions", value: "Please describe your issue and a moderator will assist you shortly.", inline: false },
    ]);

    await ticketChannel.send({
      content: `Hello <@${interaction.user.id}>! Welcome to your support ticket.`,
      embeds: [embed],
      components: [closeButton],
    });

    await interaction.reply({ 
      content: `Your ticket has been created: ${ticketChannel}`, 
      ephemeral: true 
    });

  } catch (error) {
    console.error("Error creating ticket:", error);
    await interaction.reply({ content: "Failed to create ticket.", ephemeral: true });
  }
}

async function handleCloseTicket(interaction: ButtonInteraction) {
  if (!interaction.guild || !interaction.channel) {
    return interaction.reply({ content: "This feature can only be used in a server.", ephemeral: true });
  }

  try {
    const ticket = await storage.getTicketByChannel(interaction.channel.id);
    
    if (!ticket) {
      return interaction.reply({ content: "This is not a valid ticket channel.", ephemeral: true });
    }

    // Update ticket status
    await storage.updateTicket(ticket.id, { status: "closed" });

    // Log the closure
    await storage.createModerationLog({
      serverId: interaction.guild.id,
      targetUserId: ticket.userId,
      moderatorUserId: interaction.user.id,
      action: "ticket_close",
      reason: "Ticket closed",
    });

    const embed = createInfoEmbed("Ticket Closed", [
      { name: "Closed by", value: `<@${interaction.user.id}>`, inline: true },
      { name: "Original User", value: `<@${ticket.userId}>`, inline: true },
      { name: "Status", value: "Closed", inline: true },
    ]);

    await interaction.reply({ embeds: [embed] });

    // Delete the channel after 10 seconds
    setTimeout(async () => {
      try {
        await interaction.channel?.delete();
      } catch (error) {
        console.error("Error deleting ticket channel:", error);
      }
    }, 10000);

  } catch (error) {
    console.error("Error closing ticket:", error);
    await interaction.reply({ content: "Failed to close ticket.", ephemeral: true });
  }
}

// Export function to create ticket panel
export async function createTicketPanel(channel: any) {
  const embed = createInfoEmbed("Support Tickets", [
    { name: "Need Help?", value: "Click the button below to create a support ticket.", inline: false },
    { name: "Guidelines", value: "• Be patient and respectful\n• Provide clear details about your issue\n• Wait for a moderator to respond", inline: false },
  ]);

  const button = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId("create_ticket")
        .setLabel("Create Ticket")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🎫")
    );

  return await channel.send({ embeds: [embed], components: [button] });
}
