const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const scraper = require('../services/scraper');
const embedBuilder = require('../utils/embedBuilder');

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

            await interaction.editReply({
                embeds: [embed],
                components: [reportButton]
            });

        } catch (error) {
            console.error('Error in lookup command:', error);
            const errorEmbed = embedBuilder.createErrorEmbed(error);
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },

    async handleReportButton(interaction, username) {
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

        try {
            await interaction.showModal(modal);
        } catch (error) {
            console.error('Error showing modal:', error);
            await interaction.reply({
                content: 'An error occurred while opening the report form.',
                ephemeral: true
            });
        }
    }
};
