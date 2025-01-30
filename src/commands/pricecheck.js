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
            // Try exact matches first
            let commodity = commodities.find(c => 
                c.code === commodityName || 
                c.name.toUpperCase() === commodityName
            );

            // If no exact match, try partial matches
            if (!commodity) {
                commodity = commodities.find(c => 
                    c.code.includes(commodityName) || 
                    c.name.toUpperCase().includes(commodityName) ||
                    commodityName.includes(c.code) ||
                    commodityName.includes(c.name.toUpperCase())
                );
            }

            if (!commodity) {
                await interaction.editReply(`Could not find commodity: ${commodityName}`);
                return;
            }

            // Create embed with price info
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`Prices for ${commodity.name}`)
                .setURL(`https://uexcorp.space/commodities/info/name/${commodity.value}`)
                .setDescription(commodity.isPriceNA ? '⚠️ Price data currently unavailable (N/A)' : `Last updated: ${new Date().toLocaleString()}`);

            // If commodity has N/A prices, show a message but don't return
            if (commodity.isPriceNA) {
                embed.addFields({
                    name: '📝 Note',
                    value: 'This commodity exists but has no current price data. It may be:\n' +
                           '• Not currently tradeable\n' +
                           '• A new or special commodity\n' +
                           '• Temporarily unavailable',
                    inline: false
                });
            }

            // Get prices if available
            if (!commodity.isPriceNA) {
                const prices = await tradeScraper.getPrices(commodity.value);
                
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
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in pricecheck command:', error);
            await interaction.editReply('An error occurred while checking prices.');
        }
    }
};
