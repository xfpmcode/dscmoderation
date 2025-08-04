import { Client, Collection, REST, Routes } from "discord.js";
import { kickCommand, banCommand, warnCommand, warningsCommand } from "../commands/moderation";
import { serverInfoCommand, userInfoCommand, announceCommand, customCommand, caseCommand } from "../commands/utility";
import { pingCommand, cleanCommand, uptimeCommand, slowmodeCommand, dmCommand } from "../commands/extra-utility";

export async function registerCommands(client: Client) {
  // Initialize commands collection
  const commands = new Collection();
  
  // Add moderation commands
  commands.set(kickCommand.data.name, kickCommand);
  commands.set(banCommand.data.name, banCommand);
  commands.set(warnCommand.data.name, warnCommand);
  commands.set(warningsCommand.data.name, warningsCommand);
  
  // Add utility commands
  commands.set(serverInfoCommand.data.name, serverInfoCommand);
  commands.set(userInfoCommand.data.name, userInfoCommand);
  commands.set(announceCommand.data.name, announceCommand);
  commands.set(customCommand.data.name, customCommand);
  commands.set(caseCommand.data.name, caseCommand);
  
  // Add extra utility commands
  commands.set(pingCommand.data.name, pingCommand);
  commands.set(cleanCommand.data.name, cleanCommand);
  commands.set(uptimeCommand.data.name, uptimeCommand);
  commands.set(slowmodeCommand.data.name, slowmodeCommand);
  commands.set(dmCommand.data.name, dmCommand);

  // Store commands in client
  client.commands = commands;

  // Register slash commands with Discord
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  
  if (!token || !clientId) {
    console.error("Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID environment variables");
    return;
  }

  const rest = new REST().setToken(token);

  try {
    console.log("Started refreshing application (/) commands.");

    const commandData = Array.from(commands.values()).map(command => command.data.toJSON());

    // Register commands globally
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commandData },
    );

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error("Error registering commands:", error);
  }

  // Handle slash command interactions
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error("Error executing command:", error);
      
      const errorMessage = { content: "There was an error while executing this command!", ephemeral: true };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  });
}
