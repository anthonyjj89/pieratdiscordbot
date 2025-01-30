const { 
    SlashCommandBuilder, 
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder
} = require('discord.js');
const scraper = require('../services/scraper');
const embedBuilder = require('../utils/embedBuilder');
const database = require('../services/mongoDatabase');
const tradeScraper = require('../services/tradeScraper');

// Common commodities list
const COMMON_COMMODITIES = [
    'ACCO', 'AGRI', 'AGRS', 'AUTR', 'ALUM', 'AMIP', 'APHO', 'ARGO', 'ASTA', 'AUDI', 'BERY', 'BEXA',
    'BIOPL', 'BORA', 'CARB', 'CSIL', 'CHLO', 'CK13', 'COMP', 'CMAT', 'COPP', 'CORU', 'DEGR', 'DIAM',
    'DIAL', 'DILU', 'DIST', 'DOLI', 'DYMA', 'DYNF', 'ETAM', 'FFOO', 'FLUO', 'GAWE', 'GOLD', 'GOLM',
    'HADA', 'HOT', 'HELI', 'HEPH', 'HPMC', 'HFBA', 'HYDR', 'HYDF', 'IODI', 'IRON', 'JANA', 'KOPH',
    'LARA', 'LUMG', 'MARG', 'MAZE', 'MEDS', 'MERC', 'METH', 'NEON', 'NITR', 'OMPO', 'OSOH', 'PRTL',
    'PART', 'PITA', 'POTA', 'PFOO', 'PROT', 'QUAN', 'QUAR', 'RAND', 'RMC', 'REVP', 'REVE', 'RICCT',
    'SCRA', 'SHPA', 'SILI', 'SLAM', 'SOUV', 'STEE', 'STIL', 'STIM', 'SUNB', 'TARA', 'TIN', 'TITA',
    'TUNG', 'WAST', 'WIDO', 'XAPY', 'YTDO', 'YTMO', 'YTPO', 'YTRO'
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lookup')
        .setDescription('Look up a Star Citizen player profile')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The username to look up')
                .setRequired(true)),

    async execute(interaction) {
        if (!interaction.deferred) {
            await interaction.deferReply();
        }

        try {
            const username = interaction.options.getString('username');
            console.log(`Looking up profile for ${username}...`);
            
            // Create initial response
            await interaction.editReply(`🔍 Looking up profile for **${username}**...`);
            
            const profileData = await scraper.getProfileData(username);
            console.log(`Successfully fetched profile data for ${username}`);
            
            // Create embeds array
            const embeds = [];

            // Main profile embed
            // Get piracy data
            const recentPiracy = await database.getRecentPiracyHits(profileData.handle);
            const piracyHistory = await database.getPiracyHistory(profileData.handle, false, 3);

            // Create main embed with piracy info
            const mainEmbed = new EmbedBuilder()
                .setColor('#2f3136')
                .setTitle(`Star Citizen Profile: ${profileData.handle}`)
                .setURL(`https://robertsspaceindustries.com/citizens/${profileData.handle}`)
                .setTimestamp()
                .addFields(
                    {
                        name: 'Piracy History',
                        value: recentPiracy.total_hits > 0 
                            ? `🚨 ${recentPiracy.total_hits} recorded hits\nLast incident: ${new Date(recentPiracy.last_hit).toLocaleDateString()}`
                            : '✅ Clean record',
                        inline: true
                    }
                );

            // Set user avatar
            if (profileData.avatarUrl) {
                mainEmbed.setThumbnail(profileData.avatarUrl);
            }

            // Add basic info
            mainEmbed.addFields(
                { name: 'Handle', value: profileData.handle || 'N/A', inline: true },
                { name: 'Enlisted', value: profileData.enlisted || 'N/A', inline: true },
                { name: '\u200b', value: '\u200b', inline: true }
            );

            if (profileData.location) {
                mainEmbed.addFields({ 
                    name: 'Location', 
                    value: profileData.location, 
                    inline: true 
                });
            }

            // Add main user embed first
            embeds.push(mainEmbed);

            // Add detailed piracy history if exists
            if (piracyHistory.length > 0) {
                const historyEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Personal Piracy History')
                    .addFields(
                        {
                            name: '📊 Summary',
                            value: [
                                `**Total Incidents**: ${recentPiracy.total_hits}`,
                                `**Organizations Involved**: ${recentPiracy.orgs_involved}`,
                                `**Last Incident**: ${new Date(recentPiracy.last_hit).toLocaleDateString()}`
                            ].join('\n'),
                            inline: false
                        }
                    );

                // Add each incident as a separate field
                piracyHistory.forEach((hit, index) => {
                    const incidentDate = new Date(hit.hit_date).toLocaleDateString();
                    let incidentDetails = `**Date**: ${incidentDate}\n`;
                    
                    if (hit.details) {
                        incidentDetails += `**Details**: ${hit.details}\n`;
                    }
                    
                    if (hit.org_id) {
                        incidentDetails += `**Organization**: ${hit.org_id}\n`;
                        if (hit.org_hit_date) {
                            incidentDetails += `**Org Hit Date**: ${new Date(hit.org_hit_date).toLocaleDateString()}\n`;
                        }
                        if (hit.org_hit_details) {
                            incidentDetails += `**Org Context**: ${hit.org_hit_details}`;
                        }
                    }

                    historyEmbed.addFields({
                        name: `🏴‍☠️ Incident #${index + 1}`,
                        value: incidentDetails,
                        inline: false
                    });
                });

                historyEmbed.setFooter({ 
                    text: `Showing ${piracyHistory.length} most recent incidents` 
                });

                embeds.push(historyEmbed);
            }

            // Add main org info
            if (profileData.mainOrg) {
                const mainOrgEmbed = new EmbedBuilder()
                    .setColor('#2f3136')
                    .setTitle('Main Organization');

                if (profileData.mainOrg.isRedacted) {
                    mainOrgEmbed.setDescription('**[REDACTED]**');
                } else {
                    // Get org piracy data
                    const orgPiracyData = await database.getRecentPiracyHits(profileData.mainOrg.sid, true);
                    const orgPiracyHistory = await database.getPiracyHistory(profileData.mainOrg.sid, true, 5);

                    // Set org logo as thumbnail
                    if (profileData.mainOrg.logoUrl) {
                        mainOrgEmbed.setThumbnail(profileData.mainOrg.logoUrl);
                    }

                    // Add org details
                    mainOrgEmbed
                        .setTitle(`Main Organization: ${profileData.mainOrg.name}`)
                        .setURL(profileData.mainOrg.url)
                        .addFields(
                            { 
                                name: 'Organization Details', 
                                value: [
                                    `**SID**: ${profileData.mainOrg.sid}`,
                                    `**Rank**: ${profileData.mainOrg.rank}`,
                                    `**Members**: ${profileData.mainOrg.memberCount}`
                                ].join('\n'),
                                inline: false 
                            }
                        );

                    // Add piracy warning if exists
                    if (orgPiracyData.total_hits > 0) {
                        mainOrgEmbed.addFields({
                            name: '🚨 Organization Piracy Warning',
                            value: [
                                `**Total Incidents**: ${orgPiracyData.total_hits}`,
                                `**Unique Members Hit**: ${orgPiracyData.unique_members_hit}`,
                                `**Last Incident**: ${new Date(orgPiracyData.last_hit).toLocaleDateString()}`
                            ].join('\n'),
                            inline: false
                        });

                        // Add recent hit history
                        if (orgPiracyHistory.length > 0) {
                            const historyText = orgPiracyHistory.map(hit => 
                                `• ${new Date(hit.hit_date).toLocaleDateString()} - ${hit.member_handle}\n` +
                                `  ${hit.details}`
                            ).join('\n\n');

                            mainOrgEmbed.addFields({
                                name: 'Recent Incidents',
                                value: historyText || 'No detailed history available',
                                inline: false
                            });
                        }
                    } else {
                        mainOrgEmbed.addFields({
                            name: '✅ Organization Status',
                            value: 'No recorded piracy incidents',
                            inline: false
                        });
                    }
                }

                embeds.push(mainOrgEmbed);
            }

            // Add affiliated orgs
            if (profileData.affiliatedOrgs?.length > 0) {
                for (const org of profileData.affiliatedOrgs) {
                    const orgEmbed = new EmbedBuilder()
                        .setColor('#2f3136')
                        .setTitle('Affiliated Organization');

                    if (org.isRedacted) {
                        orgEmbed.setDescription('**[REDACTED]**');
                    } else {
                        // Get org piracy data
                        const orgPiracyData = await database.getRecentPiracyHits(org.sid, true);
                        const orgPiracyHistory = await database.getPiracyHistory(org.sid, true, 3);

                        // Set org logo as thumbnail
                        if (org.logoUrl) {
                            orgEmbed.setThumbnail(org.logoUrl);
                        }

                        // Add org details
                        orgEmbed
                            .setTitle(`Affiliated Organization: ${org.name}`)
                            .setURL(org.url)
                            .addFields(
                                { 
                                    name: 'Organization Details', 
                                    value: [
                                        `**SID**: ${org.sid}`,
                                        `**Rank**: ${org.rank}`,
                                        `**Members**: ${org.memberCount}`
                                    ].join('\n'),
                                    inline: false 
                                }
                            );

                        // Add piracy warning if exists
                        if (orgPiracyData.total_hits > 0) {
                            orgEmbed.addFields({
                                name: '🚨 Organization Piracy Warning',
                                value: [
                                    `**Total Incidents**: ${orgPiracyData.total_hits}`,
                                    `**Unique Members Hit**: ${orgPiracyData.unique_members_hit}`,
                                    `**Last Incident**: ${new Date(orgPiracyData.last_hit).toLocaleDateString()}`
                                ].join('\n'),
                                inline: false
                            });

                            // Add recent hit history
                            if (orgPiracyHistory.length > 0) {
                                const historyText = orgPiracyHistory.map(hit => 
                                    `• ${new Date(hit.hit_date).toLocaleDateString()} - ${hit.member_handle}\n` +
                                    `  ${hit.details}`
                                ).join('\n\n');

                                orgEmbed.addFields({
                                    name: 'Recent Incidents',
                                    value: historyText || 'No detailed history available',
                                    inline: false
                                });
                            }
                        } else {
                            orgEmbed.addFields({
                                name: '✅ Organization Status',
                                value: 'No recorded piracy incidents',
                                inline: false
                            });
                        }
                    }

                    embeds.push(orgEmbed);
                }
            }

            // Create report button
            const reportButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('report_piracy')
                    .setLabel('Report Hit')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏴‍☠️')
            );

            // Send all embeds
            await interaction.editReply({
                content: null,
                embeds: embeds,
                components: [reportButton]
            });

        } catch (error) {
            console.error('Error in lookup command:', error);
            let errorMessage = 'An error occurred while looking up the profile.';
            
            if (error.message === 'Profile not found') {
                errorMessage = `Could not find profile for: ${error.username}`;
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = 'Request timed out. The RSI website might be slow or down. Please try again in a few minutes.';
            } else if (error.response?.status === 429) {
                errorMessage = 'Rate limited by RSI website. Please try again in a few minutes.';
            }

            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Error')
                .setDescription(errorMessage);

            await interaction.editReply({ 
                content: null,
                embeds: [errorEmbed] 
            });
        }
    },

    async handleReportButton(interaction, username) {
        try {
            // Get list of commodities from trade scraper
            const commodities = await tradeScraper.getCommodities();
            
            // Filter to just common commodities and ensure we stay within Discord's limit
            const filteredCommodities = commodities
                .filter(c => COMMON_COMMODITIES.includes(c.value?.toUpperCase() || c.name.toUpperCase()))
                .slice(0, 25);

            // Store username for later steps
            interaction.client.reportData = interaction.client.reportData || {};
            interaction.client.reportData[interaction.user.id] = { username };

            // Create commodity select menu
            const commoditySelect = new StringSelectMenuBuilder()
                .setCustomId('commodity_select')
                .setPlaceholder('Select cargo type')
                .addOptions(
                    filteredCommodities.map(commodity => ({
                        label: `${commodity.code} - ${commodity.name}`,
                        value: commodity.value || commodity.name,
                        description: `Avg: ${tradeScraper.formatPrice(commodity.avgPrice)} aUEC/unit`
                    }))
                );

            const row = new ActionRowBuilder().addComponents(commoditySelect);

            await interaction.reply({
                content: 'Step 1: Select the type of cargo that was stolen',
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error showing commodity select:', error);
            await interaction.reply({
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
            reportData.prices = prices;

            // Create cargo details modal
            const modal = new ModalBuilder()
                .setCustomId('cargo_details_modal')
                .setTitle('Report Hit - Cargo Details');

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

            // Show price info and modal
            const priceEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`Current Prices for ${reportData.commodity}`);

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

            await interaction.reply({ embeds: [priceEmbed], ephemeral: true });
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
                { name: 'Target', value: reportData.username, inline: true },
                { name: 'Cargo', value: `${reportData.boxes} boxes of ${reportData.commodity}`, inline: true },
                { name: 'Selling At', value: location, inline: true },
                { name: 'Price', value: `${price.toFixed(2)} aUEC/unit`, inline: true },
                { name: 'Total Value', value: `${tradeScraper.formatPrice(totalValue)} aUEC`, inline: false }
            );

        if (notes) {
            embed.addFields({ name: 'Notes', value: notes, inline: false });
        }

        await interaction.reply({
            content: 'Step 2: Select the crew members who participated in this hit',
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    },

    async handleCrewSelect(interaction) {
        const reportData = interaction.client.reportData[interaction.user.id];
        const selectedUsers = interaction.values;
        reportData.crew = selectedUsers;

        // Create role selection menu for each crew member
        const rows = [];
        for (const userId of selectedUsers) {
            const roleSelect = new StringSelectMenuBuilder()
                .setCustomId(`role_select_${userId}`)
                .setPlaceholder(`Select role for ${interaction.client.users.cache.get(userId).username}`)
                .addOptions([
                    { label: 'General Crew', value: 'general_crew', description: 'Standard crew member (1.0x share)' },
                    { label: 'Pilot', value: 'pilot', description: 'Flew the ship (0.8x share)' },
                    { label: 'Gunner', value: 'gunner', description: 'Operated weapons (0.8x share)' },
                    { label: 'Boarder', value: 'boarder', description: 'Boarded target ship (1.2x share)' },
                    { label: 'Escort', value: 'escort', description: 'Provided security (1.1x share)' },
                    { label: 'Storage', value: 'storage', description: 'Storing the cargo (1.0x share)' }
                ]);

            rows.push(new ActionRowBuilder().addComponents(roleSelect));
        }

        await interaction.update({
            content: 'Step 3: Select roles for each crew member',
            components: rows,
            ephemeral: true
        });
    },

    async handleRoleSelect(interaction) {
        const reportData = interaction.client.reportData[interaction.user.id];
        const userId = interaction.customId.split('_')[2];
        const selectedRole = interaction.values[0];

        // Initialize roles object if it doesn't exist
        reportData.roles = reportData.roles || {};
        reportData.roles[userId] = selectedRole;

        // Check if all crew members have roles assigned
        const allRolesAssigned = reportData.crew.every(id => reportData.roles[id]);

        if (allRolesAssigned) {
            // Calculate shares
            const totalRatios = reportData.crew.reduce((sum, id) => 
                sum + database.roleRatios[reportData.roles[id]], 0);

            reportData.crew.forEach(id => {
                const roleRatio = database.roleRatios[reportData.roles[id]];
                reportData.roles[`${id}_share`] = roleRatio / totalRatios;
            });

            // Calculate total value
            const totalValue = reportData.boxes * (reportData.prices?.boxInfo?.unitsPerBox || 100) * reportData.price;

            // Create share review embed
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('Share Distribution')
                .addFields(
                    { 
                        name: '📦 Cargo Summary', 
                        value: [
                            `**Type**: ${reportData.commodity}`,
                            `**Amount**: ${reportData.boxes} boxes`,
                            `**Price**: ${reportData.price.toFixed(2)} aUEC/unit`,
                            `**Total Value**: ${tradeScraper.formatPrice(totalValue)} aUEC`
                        ].join('\n'),
                        inline: false 
                    }
                );

            // Add crew shares
            reportData.crew.forEach(userId => {
                const user = interaction.client.users.cache.get(userId);
                const role = reportData.roles[userId];
                const ratio = database.roleRatios[role];
                const share = reportData.roles[`${userId}_share`];
                const shareAmount = Math.floor(totalValue * share);
                embed.addFields({
                    name: user.username,
                    value: `Role: ${role} (${ratio}x)\nShare: ${(share * 100).toFixed(1)}% → ${tradeScraper.formatPrice(shareAmount)} aUEC`,
                    inline: true
                });
            });

            // Create confirm button
            const confirmButton = new ButtonBuilder()
                .setCustomId('confirm_shares')
                .setLabel('Confirm & Submit Report')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(confirmButton);

            await interaction.update({
                content: 'Final Step: Review share distribution and confirm',
                embeds: [embed],
                components: [row],
                ephemeral: true
            });
        } else {
            // Show progress
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('Role Assignment Progress')
                .setDescription(
                    reportData.crew.map(id => {
                        const user = interaction.client.users.cache.get(id);
                        const role = reportData.roles[id];
                        return `${user.username}: ${role ? `✅ ${role}` : '❌ pending'}`;
                    }).join('\n')
                );

            await interaction.update({
                content: 'Continue selecting roles for remaining crew members',
                embeds: [embed],
                components: interaction.message.components,
                ephemeral: true
            });
        }
    },

    async handleConfirmShares(interaction) {
        const reportData = interaction.client.reportData[interaction.user.id];

        try {
            // Calculate total value
            const totalValue = reportData.boxes * (reportData.prices?.boxInfo?.unitsPerBox || 100) * reportData.price;

            // Save the report
            const reportId = await database.addReport({
                targetHandle: reportData.username,
                reporterId: interaction.user.id,
                cargoType: reportData.commodity,
                boxes: reportData.boxes,
                sellLocation: reportData.location,
                currentPrice: reportData.price,
                notes: reportData.notes,
                guildId: interaction.guildId,
                sellerId: reportData.crew[0] // First crew member is seller by default
            });

            // Add piracy hit record
            await database.addPiracyHit(
                reportData.username,
                false,
                `Cargo stolen: ${reportData.boxes} boxes of ${reportData.commodity}`,
                null
            );

            // Save crew members with roles and shares
            for (const userId of reportData.crew) {
                await database.addCrewMember({
                    hitId: reportId,
                    userId: userId,
                    role: reportData.roles[userId],
                    share: reportData.roles[`${userId}_share`]
                });
            }

            // Create success embed
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('Hit Report Submitted')
                .setDescription(`Hit #${reportId} recorded against ${reportData.username}`)
                .addFields(
                    { 
                        name: '📦 Cargo', 
                        value: [
                            `**Type**: ${reportData.commodity}`,
                            `**Amount**: ${reportData.boxes} boxes`,
                            `**Price**: ${reportData.price.toFixed(2)} aUEC/unit`,
                            `**Total Value**: ${tradeScraper.formatPrice(totalValue)} aUEC`
                        ].join('\n'),
                        inline: false 
                    },
                    {
                        name: '👥 Crew',
                        value: reportData.crew.map(userId => {
                            const user = interaction.client.users.cache.get(userId);
                            const role = reportData.roles[userId];
                            const share = reportData.roles[`${userId}_share`];
                            const shareAmount = Math.floor(totalValue * share);
                            return `<@${userId}> - ${role} → ${tradeScraper.formatPrice(shareAmount)} aUEC`;
                        }).join('\n'),
                        inline: false
                    }
                );

            if (reportData.notes) {
                embed.addFields({ name: '📝 Notes', value: reportData.notes, inline: false });
            }

            await interaction.update({
                content: null,
                embeds: [embed],
                components: [],
                ephemeral: false
            });

            // Clean up
            delete interaction.client.reportData[interaction.user.id];

        } catch (error) {
            console.error('Error saving report:', error);
            await interaction.update({
                content: 'An error occurred while saving the report.',
                embeds: [],
                components: [],
                ephemeral: true
            });
        }
    }
};
