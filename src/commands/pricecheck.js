const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const tradeScraper = require('../services/tradeScraper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pricecheck')
        .setDescription('Check current prices for a commodity')
        .addStringOption(option =>
            option.setName('commodity')
                .setDescription('The commodity to check')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const commodityName = interaction.options.getString('commodity').toUpperCase();
            
            // Get list of commodities to find the one requested
            const commodities = await tradeScraper.getCommodities();
            const commodity = commodities.find(c => 
                c.code === commodityName || 
                c.name.toUpperCase() === commodityName ||
                c.name.toUpperCase().includes(commodityName)
            );

            if (!commodity) {
                await interaction.editReply(`Could not find commodity: ${commodityName}`);
                return;
            }

            // Get prices for this commodity
            const prices = await tradeScraper.getPrices(commodity.value);
            
            // Check if we have valid price data
            if (!prices || !prices.bestLocation || !prices.bestLocation.price) {
                await interaction.editReply(`No current price data available for ${commodity.name}`);
                return;
            }

            // Create embed with price info
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`Prices for ${commodity.name}`)
                .setDescription(`Last updated: ${new Date().toLocaleString()}`);

            // Add best price field if available
            if (prices.bestLocation && prices.bestLocation.price) {
                embed.addFields({ 
                    name: '💰 Best Price', 
                    value: `${tradeScraper.formatPrice(prices.bestLocation.price)} aUEC/unit at ${tradeScraper.formatLocationName(prices.bestLocation.name)}`,
                    inline: false 
                });
            }

            // Add average price if available
            if (prices.averagePrice) {
                embed.addFields({ 
                    name: '📊 Average Price', 
                    value: `${tradeScraper.formatPrice(prices.averagePrice)} aUEC/unit`,
                    inline: false 
                });
            }

            // Add other locations if available
            if (prices.allLocations && prices.allLocations.length > 1) {
                const otherLocations = prices.allLocations
                    .slice(1, 4) // Show next 3 best locations
                    .filter(loc => loc && loc.price && loc.name) // Ensure valid data
                    .map(loc => `${tradeScraper.formatLocationName(loc.name)}: ${tradeScraper.formatPrice(loc.price)} aUEC/unit`)
                    .join('\n');

                if (otherLocations) {
                    embed.addFields({
                        name: '📍 Other Locations',
                        value: otherLocations,
                        inline: false
                    });
                }
            }

            // Add box information if available
            if (prices.boxInfo && prices.boxInfo.unitsPerBox && prices.bestLocation && prices.bestLocation.price) {
                embed.addFields({
                    name: '📦 Box Information',
                    value: [
                        `Units per box: ${prices.boxInfo.unitsPerBox}`,
                        `Value per box: ${tradeScraper.formatPrice(prices.bestLocation.price * prices.boxInfo.unitsPerBox)} aUEC`
                    ].join('\n'),
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in pricecheck command:', error);
            await interaction.editReply('An error occurred while checking prices.');
        }
    }
};
