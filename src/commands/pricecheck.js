const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const tradeScraper = require('../services/tradeScraper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pricecheck')
        .setDescription('Check current prices for a commodity')
        .addStringOption(option =>
            option.setName('commodity')
                .setDescription('The commodity to check')
                .setRequired(true)
                .addChoices(
                    { name: 'Laranite', value: 'Laranite' },
                    { name: 'Agricium', value: 'Agricium' },
                    { name: 'Titanium', value: 'Titanium' },
                    { name: 'Diamond', value: 'Diamond' },
                    { name: 'Gold', value: 'Gold' }
                )),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const commodity = interaction.options.getString('commodity');
            const prices = await tradeScraper.getPrices(commodity);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`Prices for ${commodity}`)
                .setTimestamp();

            // Add buy locations
            if (prices.buyLocations && prices.buyLocations.length > 0) {
                const buyLocationsText = prices.buyLocations
                    .sort((a, b) => a.price - b.price)
                    .map(loc => `${loc.location}: ${tradeScraper.formatPrice(loc.price)} aUEC/unit`)
                    .join('\n');

                embed.addFields({
                    name: 'Buy Locations',
                    value: buyLocationsText,
                    inline: false
                });
            }

            // Add sell locations
            if (prices.sellLocations && prices.sellLocations.length > 0) {
                const sellLocationsText = prices.sellLocations
                    .sort((a, b) => b.price - a.price)
                    .map(loc => `${loc.location}: ${tradeScraper.formatPrice(loc.price)} aUEC/unit`)
                    .join('\n');

                embed.addFields({
                    name: 'Sell Locations',
                    value: sellLocationsText,
                    inline: false
                });
            }

            // Add box information
            if (prices.boxInfo) {
                const boxInfoText = [
                    `Units per box: ${prices.boxInfo.unitsPerBox.toLocaleString()}`,
                    `Buy price per box: ${tradeScraper.formatPrice(prices.boxInfo.buyPrice)} aUEC`,
                    `Sell price per box: ${tradeScraper.formatPrice(prices.boxInfo.sellPrice)} aUEC`,
                    `Profit per box: ${tradeScraper.formatPrice(prices.boxInfo.profit)} aUEC`
                ].join('\n');

                embed.addFields({
                    name: 'Box Information',
                    value: boxInfoText,
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error checking prices:', error);
            await interaction.editReply({
                content: 'An error occurred while fetching prices. The price service might be unavailable.',
                ephemeral: true
            });
        }
    }
};
