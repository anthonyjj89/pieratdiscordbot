const { 
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const tradeScraper = require('../services/tradeScraper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cargo')
        .setDescription('Add cargo to hit report')
        .addStringOption(option =>
            option.setName('commodity')
                .setDescription('Type to search for commodities')
                .setRequired(true)
                .setAutocomplete(true)),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const commodities = await tradeScraper.getCommodities();
        const searchResults = tradeScraper.searchCommodities(commodities, focusedValue);
        
        // Return top 25 matches
        await interaction.respond(
            searchResults.slice(0, 25).map(commodity => ({
                name: `${commodity.code} - ${commodity.name} (${commodity.avgPrice != null ? tradeScraper.formatPrice(commodity.avgPrice) + ' aUEC/unit' : 'N/A'})`,
                value: commodity.value
            }))
        );
    },

    async execute(interaction) {
        // Check if user has active report
        if (!interaction.client.reportData?.[interaction.user.id]) {
            await interaction.reply({
                content: 'Please start a hit report first using the "Report Hit" button on a lookup.',
                ephemeral: true
            });
            return;
        }

        try {
            const selectedCommodity = interaction.options.getString('commodity');
            const prices = await tradeScraper.getPrices(selectedCommodity);
            
            // Store commodity info
            const reportData = interaction.client.reportData[interaction.user.id];
            reportData.currentCommodity = {
                type: selectedCommodity,
                prices
            };

            // Create cargo details modal
            const modal = new ModalBuilder()
                .setCustomId('cargo_details_modal')
                .setTitle('Report Hit - Cargo Details');

            const scuInput = new TextInputBuilder()
                .setCustomId('scu')
                .setLabel('How many SCU?')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('e.g., 100')
                .setRequired(true);

            const locationInput = new TextInputBuilder()
                .setCustomId('location')
                .setLabel('Where will you sell?')
                .setStyle(TextInputStyle.Short)
                .setValue(prices?.bestLocation?.name || '')
                .setPlaceholder('Best price location will be shown')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(scuInput),
                new ActionRowBuilder().addComponents(locationInput)
            );

            // Show price info and modal
            const priceEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`Current Prices for ${selectedCommodity}`);

            if (prices?.bestLocation?.price) {
                priceEmbed.addFields(
                    { 
                        name: '💰 Best Price', 
                        value: `${tradeScraper.formatPrice(prices.bestLocation.price)} aUEC/unit at ${tradeScraper.formatLocationName(prices.bestLocation.name)}`,
                        inline: false 
                    },
                    { 
                        name: '📊 Average Price', 
                        value: `${tradeScraper.formatPrice(prices.averagePrice)} aUEC/unit`,
                        inline: false 
                    }
                );
            } else {
                priceEmbed.setDescription('No current price data available');
            }

            await interaction.reply({ 
                embeds: [priceEmbed],
                ephemeral: true 
            });
            await interaction.showModal(modal);

        } catch (error) {
            console.error('Error handling cargo command:', error);
            await interaction.reply({
                content: 'An error occurred while getting price information.',
                ephemeral: true
            });
        }
    },

    async handleCargoDetails(interaction) {
        const reportData = interaction.client.reportData[interaction.user.id];
        const scu = parseInt(interaction.fields.getTextInputValue('scu'));
        const location = interaction.fields.getTextInputValue('location');

        if (isNaN(scu) || scu <= 0) {
            await interaction.reply({
                content: 'Please enter a valid SCU amount.',
                ephemeral: true
            });
            return;
        }

        // Add cargo entry
        reportData.cargo.push({
            cargoType: reportData.currentCommodity.type,
            scu: scu,
            sellLocation: location,
            currentPrice: reportData.currentCommodity.prices?.bestLocation?.price || 0
        });

        // Create cargo summary embed
        const summaryEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('Cargo Summary');

        let totalValue = 0;
        const cargoDetails = reportData.cargo.map(cargo => {
            const value = cargo.scu * 100 * cargo.currentPrice;
            totalValue += value;
            return `• ${cargo.scu} SCU of ${cargo.cargoType}\n` +
                   `  📍 ${cargo.sellLocation}\n` +
                   `  💰 ${tradeScraper.formatPrice(value)} aUEC`;
        }).join('\n\n');

        summaryEmbed.addFields(
            { 
                name: '📦 Cargo List', 
                value: cargoDetails,
                inline: false 
            },
            {
                name: '💰 Total Value',
                value: `${tradeScraper.formatPrice(totalValue)} aUEC`,
                inline: false
            }
        );

        // Create buttons
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('add_more_cargo')
                .setLabel('Add More Cargo')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('continue_to_crew')
                .setLabel('Continue to Crew Selection')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(false)
        );

        await interaction.reply({
            content: 'Cargo added successfully! You can add more cargo or continue to crew selection.',
            embeds: [summaryEmbed],
            components: [buttons],
            ephemeral: true
        });
    },

    createModal() {
        const modal = new ModalBuilder()
            .setCustomId('cargo_details_modal')
            .setTitle('Add Cargo');

        const commodityInput = new TextInputBuilder()
            .setCustomId('commodity')
            .setLabel('Enter commodity name or code')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., SLAM or Widow')
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(commodityInput)
        );

        return modal;
    }
};
