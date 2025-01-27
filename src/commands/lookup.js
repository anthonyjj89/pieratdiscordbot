const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const scraper = require('../services/scraper');
const embedBuilder = require('../utils/embedBuilder');
const database = require('../services/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lookup')
        .setDescription('Look up a Star Citizen player profile')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The username to look up')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const username = interaction.options.getString('username');
            const profileData = await scraper.getProfileData(username);
            
            const embed = embedBuilder.createProfileEmbed(profileData);
            const reportButton = embedBuilder.createReportButton();

            const message = await interaction.editReply({
                embeds: [embed],
                components: [reportButton]
            });

            // Create a collector for the report button
            const filter = i => i.customId === 'report_piracy' && i.user.id === interaction.user.id;
            const collector = message.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                const modal = new ModalBuilder()
                    .setCustomId(`piracy_report_${username}`)
                    .setTitle('Report Piracy');

                // Create the cargo type input
                const cargoTypeInput = new TextInputBuilder()
                    .setCustomId('cargo_type')
                    .setLabel('What cargo was stolen?')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g., Titanium, Medical Supplies')
                    .setRequired(true);

                // Create the amount input
                const amountInput = new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel('How much cargo was stolen?')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g., 50000')
                    .setRequired(true);

                // Create the notes input
                const notesInput = new TextInputBuilder()
                    .setCustomId('notes')
                    .setLabel('Additional notes')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('e.g., Location, circumstances...')
                    .setRequired(false);

                // Add inputs to the modal
                const firstActionRow = new ActionRowBuilder().addComponents(cargoTypeInput);
                const secondActionRow = new ActionRowBuilder().addComponents(amountInput);
                const thirdActionRow = new ActionRowBuilder().addComponents(notesInput);

                modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

                await i.showModal(modal);
            });

            // Handle modal submit
            const filter2 = i => i.customId === `piracy_report_${username}`;
            interaction.channel.awaitModalSubmit({ filter: filter2, time: 300000 })
                .then(async modalInteraction => {
                    const cargoType = modalInteraction.fields.getTextInputValue('cargo_type');
                    const amount = parseInt(modalInteraction.fields.getTextInputValue('amount'));
                    const notes = modalInteraction.fields.getTextInputValue('notes');

                    if (isNaN(amount)) {
                        await modalInteraction.reply({ content: 'Invalid amount entered. Please enter a number.', ephemeral: true });
                        return;
                    }

                    try {
                        await database.addReport({
                            targetHandle: username,
                            reporterId: modalInteraction.user.id,
                            cargoType,
                            amount,
                            notes,
                            guildId: modalInteraction.guildId
                        });

                        await modalInteraction.reply({ 
                            content: `Piracy report submitted for ${username}! Use /hits to view all reports.`,
                            ephemeral: true 
                        });
                    } catch (error) {
                        console.error('Error saving piracy report:', error);
                        await modalInteraction.reply({ 
                            content: 'An error occurred while saving the report.',
                            ephemeral: true 
                        });
                    }
                })
                .catch(error => {
                    console.error('Modal interaction error:', error);
                });

        } catch (error) {
            console.error('Error in lookup command:', error);
            const errorEmbed = embedBuilder.createErrorEmbed(error);
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
