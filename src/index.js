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
            const command = interaction.commandName === 'hits' ? 
                client.commands.get('hits') : 
                client.commands.get(interaction.commandName);
            
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
            const lookupCommand = client.commands.get('lookup');
            const helpCommand = client.commands.get('help');
            const hitsCommand = client.commands.get('hits');

            try {
                if (interaction.customId.startsWith('cmd_')) {
                    await helpCommand.handleButton(interaction);
                } else if (interaction.customId === 'report_piracy') {
                    const username = interaction.message.embeds[0].title.split(': ')[1];
                    await lookupCommand.handleReportButton(interaction, username);
                } else if (interaction.customId === 'search_commodity') {
                    await lookupCommand.handleSearchCommodity(interaction);
                } else if (interaction.customId === 'back_to_common') {
                    await lookupCommand.handleBackToCommon(interaction);
                } else if (interaction.customId === 'add_more_cargo') {
                    await lookupCommand.handleAddMoreCargo(interaction);
                } else if (interaction.customId === 'continue_to_crew') {
                    await lookupCommand.handleContinueToCrew(interaction);
                } else if (interaction.customId === 'confirm_shares') {
                    await lookupCommand.handleConfirmShares(interaction);
                } else if (interaction.customId === 'prev_page' || interaction.customId === 'next_page') {
                    const currentPage = parseInt(interaction.message.embeds[0].description.split('/')[0].split(' ')[1]);
                    const newPage = interaction.customId === 'prev_page' ? currentPage - 1 : currentPage + 1;
                    await hitsCommand.handleList({
                        ...interaction,
                        options: {
                            getInteger: () => newPage
                        }
                    });
                }
            } catch (error) {
                console.error('Error handling button:', error);
                await interaction.reply({
                    content: 'An error occurred while processing the button click.',
                    ephemeral: true
                });
            }
            return;
        }

        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            const lookupCommand = client.commands.get('lookup');
            const helpCommand = client.commands.get('help');

            try {
                if (interaction.customId.startsWith('help_')) {
                    await helpCommand.handleModalSubmit(interaction);
                } else if (interaction.customId === 'search_commodity_modal') {
                    await lookupCommand.handleSearchModal(interaction);
                } else if (interaction.customId === 'cargo_details_modal') {
                    await lookupCommand.handleCargoDetails(interaction);
                } else if (interaction.customId === 'crew_details_modal') {
                    await lookupCommand.handleCrewDetails(interaction);
                } else if (interaction.customId === 'confirm_report_modal') {
                    await lookupCommand.handleConfirmReport(interaction);
                }
            } catch (error) {
                console.error('Error handling modal submit:', error);
                await interaction.reply({
                    content: 'An error occurred while processing the form.',
                    ephemeral: true
                });
            }
            return;
        }

        // Handle select menus
        if (interaction.isStringSelectMenu()) {
            const lookupCommand = client.commands.get('lookup');

            try {
            if (interaction.customId === 'commodity_select') {
                await lookupCommand.handleCommoditySelect(interaction);
            }
            } catch (error) {
                console.error('Error handling select menu:', error);
                await interaction.reply({
                    content: 'An error occurred while processing your selection.',
                    ephemeral: true
                });
            }
            return;
        }

        // Handle user select menus
        if (interaction.isUserSelectMenu()) {
            const lookupCommand = client.commands.get('lookup');
            const helpCommand = client.commands.get('help');

            try {
                if (interaction.customId === 'help_pay_user_select') {
                    await helpCommand.handleUserSelect(interaction);
                } else if (interaction.customId === 'crew_select') {
                    await lookupCommand.handleCrewSelect(interaction);
                }
            } catch (error) {
                console.error('Error handling user select:', error);
                await interaction.reply({
                    content: 'An error occurred while processing user selection.',
                    ephemeral: true
                });
            }
            return;
        }

    } catch (error) {
        console.error('Interaction error:', error);
        try {
            const errorReply = {
                content: 'An unexpected error occurred. Please try again.',
                ephemeral: true
            };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorReply);
            } else {
                await interaction.reply(errorReply);
            }
        } catch (replyError) {
            console.error('Error sending error message:', replyError);
        }
    }
});

// Login
client.login(process.env.DISCORD_TOKEN);
