const { 
    SlashCommandBuilder, 
    EmbedBuilder,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const database = require('../services/database');
const tradeScraper = require('../services/tradeScraper');
const scraper = require('../services/scraper');

// All trade commodities from UEX
const COMMON_COMMODITIES = [
    // Row 1
    'ACCO', 'AGRI', 'AGRS', 'AUTR', 'ALUM', 'AMIP', 'APHO', 'ARGO', 'ASTA', 'AUDI', 'BERY', 'BEXA',
    // Row 2
    'BIOPL', 'BORA', 'CARB', 'CSIL', 'CHLO', 'CK13', 'COMP', 'CMAT', 'COPP', 'CORU', 'DEGR', 'DIAM',
    // Row 3
    'DIAL', 'DILU', 'DIST', 'DOLI', 'DYMA', 'DYNF', 'ETAM', 'FFOO', 'FLUO', 'GAWE', 'GOLD', 'GOLM',
    // Row 4
    'HADA', 'HOT', 'HELI', 'HEPH', 'HPMC', 'HFBA', 'HYDR', 'HYDF', 'IODI', 'IRON', 'JANA', 'KOPH',
    // Row 5
    'LARA', 'LUMG', 'MARG', 'MAZE', 'MEDS', 'MERC', 'METH', 'NEON', 'NITR', 'OMPO', 'OSOH', 'PRTL',
    // Row 6
    'PART', 'PITA', 'POTA', 'PFOO', 'PROT', 'QUAN', 'QUAR', 'RAND', 'RMC', 'REVP', 'REVE', 'RICCT',
    // Row 7
    'SCRA', 'SHPA', 'SILI', 'SLAM', 'SOUV', 'STEE', 'STIL', 'STIM', 'SUNB', 'TARA', 'TIN', 'TITA',
    // Row 8
    'TUNG', 'WAST', 'WIDO', 'XAPY', 'YTDO', 'YTMO', 'YTPO', 'YTRO'
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hits')
        .setDescription('Manage piracy reports')
        .addSubcommand(subcommand =>
            subcommand
                .setName('report')
                .setDescription('Report a new hit')
                .addStringOption(option =>
                    option.setName('target')
                        .setDescription('The player who was hit')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View all piracy reports')
                .addIntegerOption(option =>
                    option.setName('page')
                        .setDescription('Page number')
                        .setMinValue(1))),

    async execute(interaction) {
        if (interaction.options.getSubcommand() === 'report') {
            await this.handleReport(interaction);
        } else {
            await this.handleList(interaction);
        }
    },

    async handleReport(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            // Get list of commodities from trade scraper
            const commodities = await tradeScraper.getCommodities();
            
            // Filter to just common commodities and ensure we stay within Discord's limit
            const filteredCommodities = commodities
                .filter(c => COMMON_COMMODITIES.includes(c.value?.toUpperCase() || c.name.toUpperCase()))
                .slice(0, 25);
            
            // Create commodity select menu
            const commoditySelect = new StringSelectMenuBuilder()
                .setCustomId('commodity_select')
                .setPlaceholder('Select cargo type')
                .addOptions(
                    filteredCommodities.map(commodity => ({
                        label: commodity.name,
                        value: commodity.value || commodity.name,
                        description: `Avg: ${tradeScraper.formatPrice(commodity.avgPrice)} aUEC/unit`
                    }))
                );

            const row = new ActionRowBuilder().addComponents(commoditySelect);

            // Store target for later
            interaction.client.reportData = interaction.client.reportData || {};
            interaction.client.reportData[interaction.user.id] = {
                target: interaction.options.getString('target')
            };

            await interaction.editReply({
                content: 'Step 1: Select the type of cargo that was stolen',
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error starting report:', error);
            await interaction.editReply({
                content: 'An error occurred while starting the report.',
                ephemeral: true
            });
        }
    },

    async handleCommoditySelect(interaction) {
        const reportData = interaction.client.reportData[interaction.user.id];
        reportData.commodity = interaction.values[0];

        try {
            // Get prices for selected commodity
            const prices = await tradeScraper.getPrices(reportData.commodity);
            
            // Check if we have valid price data
            if (!prices || !prices.bestLocation || !prices.bestLocation.price) {
                reportData.prices = {
                    bestLocation: { name: '', price: 0 },
                    averagePrice: 0,
                    boxInfo: { unitsPerBox: 100 }
                };
            } else {
                reportData.prices = prices;
            }

            // Create price info embed
            const priceEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`Current Prices for ${reportData.commodity}`);

            if (prices && prices.bestLocation && prices.bestLocation.price) {
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

            // Create box count modal
            const modal = new ModalBuilder()
                .setCustomId('cargo_details_modal')
                .setTitle('Cargo Details');

            const boxesInput = new TextInputBuilder()
                .setCustomId('boxes')
                .setLabel('How many boxes?')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('e.g., 50')
                .setRequired(true);

            const priceInput = new TextInputBuilder()
                .setCustomId('price')
                .setLabel('Price per unit (aUEC)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder(`e.g., ${prices?.bestLocation?.price || '20000'}`)
                .setValue(prices?.bestLocation?.price?.toString() || '')
                .setRequired(true);

            const locationInput = new TextInputBuilder()
                .setCustomId('location')
                .setLabel('Where will you sell?')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder(prices?.bestLocation?.name || 'e.g., CRU-L5')
                .setValue(prices?.bestLocation?.name || '')
                .setRequired(true);

            const notesInput = new TextInputBuilder()
                .setCustomId('notes')
                .setLabel('Additional notes')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('e.g., Location, circumstances...')
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(boxesInput),
                new ActionRowBuilder().addComponents(priceInput),
                new ActionRowBuilder().addComponents(locationInput),
                new ActionRowBuilder().addComponents(notesInput)
            );

            await interaction.reply({ embeds: [priceEmbed], ephemeral: true });
            await interaction.followUp({ content: 'Step 2: Enter cargo details', components: [], ephemeral: true });
            await interaction.showModal(modal);

        } catch (error) {
            console.error('Error handling commodity selection:', error);
            await interaction.reply({
                content: 'An error occurred while getting price information.',
                ephemeral: true
            });
        }
    },

    async handleCargoDetails(interaction) {
        const reportData = interaction.client.reportData[interaction.user.id];
        const boxes = parseInt(interaction.fields.getTextInputValue('boxes'));
        const price = parseFloat(interaction.fields.getTextInputValue('price'));
        const location = interaction.fields.getTextInputValue('location');
        const notes = interaction.fields.getTextInputValue('notes');

        if (isNaN(boxes) || boxes <= 0) {
            await interaction.reply({
                content: 'Please enter a valid number of boxes.',
                ephemeral: true
            });
            return;
        }

        if (isNaN(price) || price <= 0) {
            await interaction.reply({
                content: 'Please enter a valid price.',
                ephemeral: true
            });
            return;
        }

        reportData.boxes = boxes;
        reportData.price = price;
        reportData.location = location;
        reportData.notes = notes;

        // Calculate total value
        const totalValue = boxes * (reportData.prices?.boxInfo?.unitsPerBox || 100) * price;

        // Create crew selection
        const crewSelect = new UserSelectMenuBuilder()
            .setCustomId('crew_select')
            .setPlaceholder('Select crew members')
            .setMinValues(1)
            .setMaxValues(5);

        const row = new ActionRowBuilder().addComponents(crewSelect);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('Hit Report Preview')
            .addFields(
                { name: 'Target', value: reportData.target, inline: true },
                { name: 'Cargo', value: `${reportData.boxes} boxes of ${reportData.commodity}`, inline: true },
                { name: 'Selling At', value: location, inline: true },
                { name: 'Price', value: `${price.toFixed(2)} aUEC/unit`, inline: true },
                { name: 'Total Value', value: `${tradeScraper.formatPrice(totalValue)} aUEC`, inline: false }
            );

        if (notes) {
            embed.addFields({ name: 'Notes', value: notes, inline: false });
        }

        await interaction.reply({
            content: 'Step 3: Select the crew members who participated in this hit',
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    },

    async handleCrewSelect(interaction) {
        const reportData = interaction.client.reportData[interaction.user.id];
        const selectedUsers = interaction.values;
        reportData.crew = selectedUsers;

        // Create seller selection from crew
        const sellerSelect = new UserSelectMenuBuilder()
            .setCustomId('seller_select')
            .setPlaceholder('Select who will sell the cargo')
            .setMinValues(1)
            .setMaxValues(1);

        const row = new ActionRowBuilder().addComponents(sellerSelect);

        await interaction.reply({
            content: 'Final Step: Select who will be selling the cargo',
            components: [row],
            ephemeral: true
        });
    },

    async handleSellerSelect(interaction) {
        const reportData = interaction.client.reportData[interaction.user.id];
        const seller = interaction.values[0];
        reportData.seller = seller;

        try {
            // Get target's profile data for org hits
            const profileData = await scraper.getProfileData(reportData.target);
            const totalValue = reportData.boxes * (reportData.prices?.boxInfo?.unitsPerBox || 100) * reportData.price;

            // Save the report
            const reportId = await database.addReport({
                targetHandle: reportData.target,
                reporterId: interaction.user.id,
                cargoType: reportData.commodity,
                boxes: reportData.boxes,
                sellLocation: reportData.location,
                currentPrice: reportData.price,
                notes: reportData.notes,
                guildId: interaction.guildId,
                sellerId: seller
            });

            // Add piracy hit for user
            await database.addPiracyHit(
                reportData.target,
                false,
                `Cargo stolen: ${reportData.boxes} ${reportData.commodity}`,
                profileData.mainOrg?.sid || null
            );

            // Add piracy hit for main org if exists
            if (profileData.mainOrg && !profileData.mainOrg.isRedacted) {
                await database.addPiracyHit(
                    profileData.mainOrg.sid,
                    true,
                    `Member ${reportData.target} hit: ${reportData.boxes} ${reportData.commodity}`,
                    reportData.target
                );
            }

            // Add piracy hits for affiliated orgs
            if (profileData.affiliatedOrgs) {
                for (const org of profileData.affiliatedOrgs) {
                    if (!org.isRedacted) {
                        await database.addPiracyHit(
                            org.sid,
                            true,
                            `Member ${reportData.target} hit: ${reportData.boxes} ${reportData.commodity}`,
                            reportData.target
                        );
                    }
                }
            }

            // Save crew members with roles and ratios
            for (const userId of reportData.crew) {
                const roleRatio = database.roleRatios[reportData.roles?.[userId]] || 1.0;
                const totalRatios = reportData.crew.reduce((sum, id) => 
                    sum + (database.roleRatios[reportData.roles?.[id]] || 1.0), 0);
                const share = roleRatio / totalRatios;

                await database.addCrewMember({
                    hitId: reportId,
                    userId: userId,
                    role: reportData.roles?.[userId] || 'general_crew',
                    share: share
                });
            }

            // Create success embed
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('Hit Report Submitted')
                .setDescription(`Hit #${reportId} has been recorded`)
                .addFields(
                    { name: 'Target', value: reportData.target, inline: true },
                    { name: 'Cargo', value: `${reportData.boxes} boxes of ${reportData.commodity}`, inline: true },
                    { name: 'Selling At', value: reportData.location, inline: true },
                    { name: 'Price', value: `${reportData.price.toFixed(2)} aUEC/unit`, inline: true },
                    { name: 'Total Value', value: `${tradeScraper.formatPrice(totalValue)} aUEC`, inline: false },
                    {
                        name: 'Crew',
                        value: reportData.crew.map(userId => {
                            const isHolder = userId === seller;
                            const role = reportData.roles?.[userId] || 'general_crew';
                            const roleRatio = database.roleRatios[role];
                            const totalRatios = reportData.crew.reduce((sum, id) => 
                                sum + (database.roleRatios[reportData.roles?.[id]] || 1.0), 0);
                            const share = roleRatio / totalRatios;
                            return `<@${userId}> - ${role} (${roleRatio}x) → ${tradeScraper.formatPrice(totalValue * share)} aUEC${isHolder ? ' (Seller)' : ''}`;
                        }).join('\n'),
                        inline: false
                    }
                );

            if (reportData.notes) {
                embed.addFields({ name: 'Notes', value: reportData.notes, inline: false });
            }

            await interaction.reply({ embeds: [embed] });

            // Clean up
            delete interaction.client.reportData[interaction.user.id];

        } catch (error) {
            console.error('Error saving report:', error);
            await interaction.reply({
                content: 'An error occurred while saving the report.',
                ephemeral: true
            });
        }
    },

    async handleList(interaction) {
        await interaction.deferReply();

        try {
            const page = interaction.options.getInteger('page') || 1;
            const reports = await database.getReports(interaction.guildId, page);
            const totalReports = await database.getTotalReports(interaction.guildId);
            const totalPages = Math.ceil(totalReports / 5);

            if (reports.length === 0) {
                await interaction.editReply('No piracy reports found.');
                return;
            }

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('📊 Piracy Reports')
                .setDescription(`Page ${page}/${totalPages}`)
                .setTimestamp();

            for (const report of reports) {
                const totalValue = report.boxes * 100 * report.current_price;
                const crewList = report.crew.map(member => {
                    const isSeller = member.userId === report.seller_id;
                    const roleInfo = member.role ? ` - ${member.role} (${member.role_ratio}x)` : '';
                    const amount = tradeScraper.formatPrice(totalValue * member.share);
                    return `<@${member.userId}>${roleInfo} → ${amount} aUEC${isSeller ? ' (Seller)' : ''}`;
                }).join('\n');

                const fieldValue = [
                    `**Cargo**: ${report.boxes} boxes of ${report.cargo_type}`,
                    `**Location**: ${report.sell_location}`,
                    `**Price**: ${report.current_price.toFixed(2)} aUEC/unit`,
                    `**Total Value**: ${tradeScraper.formatPrice(totalValue)} aUEC`,
                    `**Status**: ${report.status}`,
                    '**Crew**:',
                    crewList
                ].join('\n');

                embed.addFields({
                    name: `Hit #${report.id} - ${report.target_handle}`,
                    value: fieldValue,
                    inline: false
                });
            }

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

        } catch (error) {
            console.error('Error listing reports:', error);
            await interaction.editReply('An error occurred while fetching reports.');
        }
    }
};
