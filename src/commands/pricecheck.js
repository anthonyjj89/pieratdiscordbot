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

            // Add best location details
            if (prices.bestLocation) {
                const best = prices.bestLocation;
                const noQuestionsIcon = best.isNoQuestions ? '👁️ ' : '';
                const containerSizes = best.containerSizes.join(', ');
                
                embed.addFields({ 
                    name: '💰 Best Price', 
                    value: [
                        `${noQuestionsIcon}**${tradeScraper.formatLocationName(best.name)}** (${best.orbit}, ${best.system})`,
                        `Price: ${tradeScraper.formatPrice(best.price.current)} aUEC/unit`,
                        `Inventory: ${best.inventory.current} SCU`,
                        `Container Sizes: ${containerSizes} SCU`,
                        best.faction ? `Faction: ${best.faction}` : ''
                    ].filter(Boolean).join('\n'),
                    inline: false 
                });
            }

            // Add other locations
            if (prices.allLocations && prices.allLocations.length > 1) {
                const otherLocations = prices.allLocations
                    .slice(1, 4) // Show next 3 best locations
                    .filter(loc => loc && loc.price && loc.name)
                    .map(loc => {
                        const noQuestionsIcon = loc.isNoQuestions ? '👁️ ' : '';
                        return `${noQuestionsIcon}**${tradeScraper.formatLocationName(loc.name)}** (${loc.orbit}): ${tradeScraper.formatPrice(loc.price.current)} aUEC/unit`;
                    })
                    .join('\n');

                if (otherLocations) {
                    embed.addFields({
                        name: '📍 Other Locations',
                        value: otherLocations,
                        inline: false
                    });
                }
            }

            // Add price statistics
            if (prices.allLocations && prices.allLocations.length > 0) {
                const allPrices = prices.allLocations.map(loc => loc.price.current);
                const minPrice = Math.min(...allPrices);
                const maxPrice = Math.max(...allPrices);
                
                embed.addFields({
                    name: '📊 Price Statistics',
                    value: [
                        `Average: ${tradeScraper.formatPrice(prices.averagePrice)} aUEC/unit`,
                        `Range: ${tradeScraper.formatPrice(minPrice)} - ${tradeScraper.formatPrice(maxPrice)} aUEC/unit`
                    ].join('\n'),
                    inline: false
                });
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
