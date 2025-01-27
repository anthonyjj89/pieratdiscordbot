require('dotenv').config();
const { Client, Collection, Events, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const database = require('./services/database');

// Create client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Command collection
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commands = [];
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    }
}

// Deploy slash commands
async function deployCommands() {
    try {
        console.log('Started refreshing application (/) commands.');
        const rest = new REST().setToken(process.env.DISCORD_TOKEN);

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error deploying commands:', error);
    }
}

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Event handlers
client.once(Events.ClientReady, async () => {
    console.log('Bot is ready!');
    await deployCommands();
});

client.on(Events.InteractionCreate, async interaction => {
    try {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('Command execution error:', error);
                const reply = { 
                    content: 'There was an error executing this command!', 
                    ephemeral: true 
                };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            }
            return;
        }

        // Handle button clicks
        if (interaction.isButton()) {
            if (interaction.customId === 'report_piracy') {
                const username = interaction.message.embeds[0].title.split(': ')[1];
                const command = client.commands.get('lookup');
                if (command && command.handleReportButton) {
                    await command.handleReportButton(interaction, username);
                }
            } else if (interaction.customId === 'crew_next') {
                const command = client.commands.get('lookup');
                if (command && command.handleCrewNext) {
                    await command.handleCrewNext(interaction);
                }
            }
            return;
        }

        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            const command = client.commands.get('lookup');
            if (!command) return;

            if (interaction.customId.startsWith('piracy_report_')) {
                await command.handleModalSubmit(interaction);
            } else if (interaction.customId === 'shares_modal') {
                await command.handleSharesSubmit(interaction);
            }
            return;
        }

        // Handle select menus
        if (interaction.isUserSelectMenu() || interaction.isStringSelectMenu()) {
            const command = client.commands.get('lookup');
            if (command && command.handleCrewSelect) {
                await command.handleCrewSelect(interaction);
            }
            return;
        }

    } catch (error) {
        console.error('Interaction error:', error);
    }
});

// Login
client.login(process.env.DISCORD_TOKEN);
