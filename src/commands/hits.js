const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const database = require('../services/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hits')
        .setDescription('View all piracy reports')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number to view')
                .setMinValue(1)
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const page = interaction.options.getInteger('page') || 1;
            const limit = 5; // Reports per page

            const reports = await database.getReports(interaction.guildId, page, limit);
            const totalReports = await database.getTotalReports(interaction.guildId);
            const totalPages = Math.ceil(totalReports / limit);

            if (reports.length === 0) {
                return interaction.editReply('No piracy reports found.');
            }

            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('📊 Piracy Reports')
                .setDescription(`Page ${page}/${totalPages}`)
                .setTimestamp();

            // Add each report to the embed
            reports.forEach((report, index) => {
                const date = new Date(report.timestamp).toLocaleDateString();
                const reportField = [
                    `**Target**: ${report.target_handle}`,
                    `**Cargo**: ${report.amount.toLocaleString()} ${report.cargo_type}`,
                    `**Date**: ${date}`,
                    report.notes ? `**Notes**: ${report.notes}` : ''
                ].filter(line => line).join('\n');

                embed.addFields({
                    name: `Report #${(page - 1) * limit + index + 1}`,
                    value: reportField,
                    inline: false
                });
            });

            // Add navigation buttons if there are multiple pages
            const components = [];
            if (totalPages > 1) {
                const row = new ActionRowBuilder();

                // Previous page button
                const prevButton = new ButtonBuilder()
                    .setCustomId('prev_page')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 1);

                // Next page button
                const nextButton = new ButtonBuilder()
                    .setCustomId('next_page')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === totalPages);

                row.addComponents(prevButton, nextButton);
                components.push(row);
            }

            await interaction.editReply({
                embeds: [embed],
                components: components
            });

            // Handle button interactions
            if (components.length > 0) {
                const filter = i => i.user.id === interaction.user.id;
                const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

                collector.on('collect', async i => {
                    const newPage = i.customId === 'prev_page' ? page - 1 : page + 1;
                    await i.deferUpdate();

                    // Execute the command again with the new page
                    const newOptions = { ...interaction };
                    newOptions.options = new Map([['page', newPage]]);
                    await this.execute(newOptions);
                });
            }

        } catch (error) {
            console.error('Error fetching piracy reports:', error);
            await interaction.editReply('An error occurred while fetching piracy reports.');
        }
    },
};
