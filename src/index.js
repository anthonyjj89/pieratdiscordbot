require('dotenv').config();
const { Client, Collection, Events, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const database = require('./services/mongoDatabase');

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
        // Handle autocomplete interactions
        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.autocomplete(interaction);
            } catch (error) {
                console.error('Error in autocomplete:', error);
            }
            return;
        }

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
            const command = client.commands.get('lookup');
            const helpCommand = client.commands.get('help');

            if (interaction.customId.startsWith('cmd_')) {
                await helpCommand.handleButton(interaction);
            } else if (interaction.customId === 'report_piracy') {
                const username = interaction.message.embeds[0].title.split(': ')[1];
                await command.handleReportButton(interaction, username);
            } else if (interaction.customId === 'crew_next') {
                await command.handleCrewNext(interaction);
            } else if (interaction.customId === 'confirm_shares') {
                await command.handleConfirmShares(interaction);
            } else if (interaction.customId === 'prev_page' || interaction.customId === 'next_page') {
                const hitsCommand = client.commands.get('hits');
                const currentPage = parseInt(interaction.message.embeds[0].description.split('/')[0].split(' ')[1]);
                const newPage = interaction.customId === 'prev_page' ? currentPage - 1 : currentPage + 1;
                await hitsCommand.handleList({
                    ...interaction,
                    options: {
                        getInteger: () => newPage
                    }
                });
            }
            return;
        }

        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            const command = client.commands.get('lookup');
            const helpCommand = client.commands.get('help');

            if (interaction.customId.startsWith('help_')) {
                await helpCommand.handleModalSubmit(interaction);
            } else if (interaction.customId.startsWith('piracy_report_')) {
                await command.handleModalSubmit(interaction);
            } else if (interaction.customId === 'cargo_details_modal') {
                const hitsCommand = client.commands.get('hits');
                await hitsCommand.handleCargoDetails(interaction);
            }
            return;
        }

        // Handle select menus
        if (interaction.isStringSelectMenu()) {
            const command = client.commands.get('lookup');
            if (interaction.customId.startsWith('role_select_')) {
                await command.handleRoleSelect(interaction);
            } else if (interaction.customId === 'commodity_select') {
                const hitsCommand = client.commands.get('hits');
                await hitsCommand.handleCommoditySelect(interaction);
            }
            return;
        }

        // Handle user select menus
        if (interaction.isUserSelectMenu()) {
            const command = client.commands.get('lookup');
            const helpCommand = client.commands.get('help');

            if (interaction.customId === 'help_pay_user_select') {
                await helpCommand.handleUserSelect(interaction);
            } else if (interaction.customId === 'crew_select') {
                await command.handleCrewSelect(interaction);
            } else if (interaction.customId === 'seller_select') {
                const hitsCommand = client.commands.get('hits');
                await hitsCommand.handleSellerSelect(interaction);
            }
            return;
        }

    } catch (error) {
        console.error('Interaction error:', error);
    }
});

// Login
client.login(process.env.DISCORD_TOKEN);
