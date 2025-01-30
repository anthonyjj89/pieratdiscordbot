const { SlashCommandBuilder, EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const tradeScraper = require('../services/tradeScraper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pricecheck')
        .setDescription('Check current prices for a commodity')
        .addStringOption(option =>
            option.setName('commodity')
                .setDescription('Start typing to search commodities')
                .setRequired(true)
                .setAutocomplete(true)),

    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused().toUpperCase();
            const commodities = await tradeScraper.getCommodities();

            // If no input, return first 25 commodities
            if (!focusedValue) {
                const choices = commodities.slice(0, 25).map(c => {
                    // Get the full name from the slug
                    const fullName = c.value.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ');
                    return {
                        name: `${c.code} - ${fullName}`,
                        value: c.value
                    };
                });
                await interaction.respond(choices);
                return;
            }

            // Filter and sort commodities based on search term
            const filtered = commodities
                .map(c => {
                    const score = this.getMatchScore(c, focusedValue);
                    return { commodity: c, score };
                })
                .filter(item => item.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 25)
                .map(item => {
                    // Get the full name from the slug
                    const fullName = item.commodity.value.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ');
                    return {
                        name: `${item.commodity.code} - ${fullName}`,
                        value: item.commodity.value
                    };
                });

            await interaction.respond(filtered);
        } catch (error) {
            console.error('Error in autocomplete:', error);
            await interaction.respond([]);
        }
    },

    // Helper function to score matches
    getMatchScore(commodity, search) {
        const code = commodity.code.toUpperCase();
        const name = commodity.name.toUpperCase();
        const searchTerm = search.toUpperCase();

        // Exact matches get highest score
        if (code === searchTerm) return 100;
        if (name === searchTerm) return 90;

        // Code matches
        if (code.startsWith(searchTerm)) return 80;
        if (code.includes(searchTerm)) return 70;

        // Name matches
        if (name.startsWith(searchTerm)) return 60;
        
        // Word matches in name
        const words = name.split(' ');
        for (const word of words) {
            if (word.startsWith(searchTerm)) return 50;
            if (word.includes(searchTerm)) return 40;
        }

        // Partial matches in name
        if (name.includes(searchTerm)) return 30;

        // Match against slug (which contains full name in lowercase)
        const slug = commodity.value.replace(/-/g, ' ');
        if (slug.includes(searchTerm.toLowerCase())) return 20;

        return 0;
    },

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

            // Get full name from slug
            const fullName = commodity.value.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');

            // Create embed with price info
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`${commodity.code} - ${fullName}`)
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
