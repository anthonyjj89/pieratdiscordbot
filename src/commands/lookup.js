const { SlashCommandBuilder } = require('discord.js');
const scraper = require('../services/scraper');
const embedBuilder = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lookup')
        .setDescription('Look up a Star Citizen profile')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The RSI username to look up')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const username = interaction.options.getString('username');
            const profileData = await scraper.getProfileData(username);
            const embed = embedBuilder.createProfileEmbed(profileData);
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            const errorEmbed = embedBuilder.createErrorEmbed(error);
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
