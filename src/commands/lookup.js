const { 
    SlashCommandBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder,
    UserSelectMenuBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const scraper = require('../services/scraper');
const embedBuilder = require('../utils/embedBuilder');
const database = require('../services/mongoDatabase');
const tradeScraper = require('../services/tradeScraper');

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
        .setName('lookup')
        .setDescription('Look up a Star Citizen player profile')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The username to look up')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const username = interaction.options.getString('username');
            const profileData = await scraper.getProfileData(username);
            
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
            const reportButton = embedBuilder.createReportButton();

            // Send all embeds
            await interaction.editReply({
                embeds: embeds,
                components: [reportButton]
            });

        } catch (error) {
            console.error('Error in lookup command:', error);
            const errorEmbed = embedBuilder.createErrorEmbed(error);
            await interaction.editReply({ embeds: [errorEmbed] });
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

            // Store username for later steps
            interaction.client.reportData = interaction.client.reportData || {};
            interaction.client.reportData[interaction.user.id] = { username };

            await interaction.reply({
                content: 'Step 1: Select the type of cargo that was stolen',
                components: [row],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error showing modal:', error);
            await interaction.reply({
                content: 'An error occurred while opening the report form.',
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

            // Create box count modal
            const modal = new ModalBuilder()
                .setCustomId(`piracy_report_${reportData.username}`)
                .setTitle('Report Piracy - Cargo Details');

            const boxesInput = new TextInputBuilder()
                .setCustomId('boxes')
                .setLabel('How many boxes?')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('e.g., 50')
                .setRequired(true);

            const notesInput = new TextInputBuilder()
                .setCustomId('notes')
                .setLabel('Additional notes')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('e.g., Location, circumstances...')
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(boxesInput),
                new ActionRowBuilder().addComponents(notesInput)
            );

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

                if (prices.bestLocation.containerSizes?.length > 0) {
                    priceEmbed.addFields({
                        name: '📦 Container Sizes',
                        value: `${prices.bestLocation.containerSizes.join(', ')} SCU`,
                        inline: false
                    });
                }
            } else {
                priceEmbed.setDescription('No current price data available');
            }

            await interaction.reply({ 
                content: 'Step 2: Enter cargo details',
                embeds: [priceEmbed],
                ephemeral: true 
            });
            await interaction.showModal(modal);

        } catch (error) {
            console.error('Error handling commodity selection:', error);
            await interaction.reply({
                content: 'An error occurred while getting price information.',
                ephemeral: true
            });
        }
    },

    async handleModalSubmit(interaction) {
        const reportData = interaction.client.reportData[interaction.user.id];
        
        // Get cargo details from modal
        const boxes = parseInt(interaction.fields.getTextInputValue('boxes'));
        const notes = interaction.fields.getTextInputValue('notes');

        if (isNaN(boxes) || boxes <= 0) {
            await interaction.reply({
                content: 'Please enter a valid number of boxes.',
                ephemeral: true
            });
            return;
        }

        // Store cargo details
        reportData.boxes = boxes;
        reportData.notes = notes;

        // Calculate total value
        const unitsPerBox = reportData.prices?.boxInfo?.unitsPerBox || 100;
        const totalUnits = boxes * unitsPerBox;
        const unitPrice = reportData.prices?.bestLocation?.price || 0;
        const totalValue = totalUnits * unitPrice;

        // Create cargo summary embed
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('Cargo Summary')
            .addFields(
                { 
                    name: '📦 Cargo Details', 
                    value: [
                        `**Type**: ${reportData.commodity}`,
                        `**Boxes**: ${boxes} (${totalUnits} units)`,
                        `**Best Price**: ${tradeScraper.formatPrice(unitPrice)} aUEC/unit`,
                        `**Total Value**: ${tradeScraper.formatPrice(totalValue)} aUEC`
                    ].join('\n'),
                    inline: false 
                }
            );

        if (notes) {
            embed.addFields({ name: '📝 Notes', value: notes, inline: false });
        }

        // Step 3: Show crew selection
        const crewSelect = new UserSelectMenuBuilder()
            .setCustomId('crew_select')
            .setPlaceholder('Select crew member')
            .setMinValues(1)
            .setMaxValues(1);

        const crewRow = new ActionRowBuilder().addComponents(crewSelect);

        await interaction.reply({
            content: 'Step 3: Select a crew member',
            embeds: [embed],
            components: [crewRow],
            ephemeral: true
        });
    },

    async handleCrewSelect(interaction) {
        const reportData = interaction.client.reportData[interaction.user.id];
        const selectedUser = interaction.values[0];

        // Create role selection menu for the selected user
        const roleSelect = new StringSelectMenuBuilder()
            .setCustomId(`role_select_${selectedUser}`)
            .setPlaceholder('Select role for this crew member')
            .addOptions([
                { label: 'General Crew', value: 'general_crew', description: 'Standard crew member (1.0 share)' },
                { label: 'Pilot', value: 'pilot', description: 'Flew the ship (0.8 share)' },
                { label: 'Gunner', value: 'gunner', description: 'Operated weapons (0.8 share)' },
                { label: 'Boarder', value: 'boarder', description: 'Boarded target ship (1.2 share)' },
                { label: 'Escort', value: 'escort', description: 'Provided security (1.1 share)' },
                { label: 'Storage', value: 'storage', description: 'Storing the cargo (1.0 share)' }
            ]);

        reportData.crew = reportData.crew || [];
        if (!reportData.crew.find(m => m.userId === selectedUser)) {
            reportData.crew.push({ userId: selectedUser, role: null });
        }

        const roleRow = new ActionRowBuilder().addComponents(roleSelect);

        const user = interaction.client.users.cache.get(selectedUser);
        await interaction.update({
            content: `Select role for ${user.username}`,
            components: [roleRow],
            ephemeral: true
        });
    },

    async handleRoleSelect(interaction) {
        const reportData = interaction.client.reportData[interaction.user.id];
        const userId = interaction.customId.split('_')[2];
        const selectedRole = interaction.values[0];

        // Update crew member's role
        const member = reportData.crew.find(m => m.userId === userId);
        if (member) {
            member.role = selectedRole;
        }

        // Create crew list embed
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('Current Crew Members')
            .setDescription(
                reportData.crew
                    .filter(m => m.role) // Only show members with roles
                    .map(m => {
                        const user = interaction.client.users.cache.get(m.userId);
                        const ratio = database.roleRatios[m.role];
                        return `• ${user.username} - ${m.role} (${ratio}x ratio)`;
                    })
                    .join('\n') || 'No crew members added yet'
            );

        // Create new crew selection with buttons
        const crewSelect = new UserSelectMenuBuilder()
            .setCustomId('crew_select')
            .setPlaceholder('Select another crew member')
            .setMinValues(1)
            .setMaxValues(1);

        const calculateButton = new ButtonBuilder()
            .setCustomId('crew_next')
            .setLabel('Calculate Shares')
            .setStyle(ButtonStyle.Primary);

        const crewRow = new ActionRowBuilder().addComponents(crewSelect);
        const buttonRow = new ActionRowBuilder().addComponents(calculateButton);

        await interaction.update({
            content: 'Select another crew member or calculate shares when done:',
            embeds: [embed],
            components: [crewRow, buttonRow]
        });
    },

    async handleCrewNext(interaction) {
        const reportData = interaction.client.reportData[interaction.user.id];
        
        if (!reportData.crew || reportData.crew.length === 0) {
            await interaction.reply({
                content: 'Please select at least one crew member first.',
                ephemeral: true
            });
            return;
        }

        // Check if all crew members have roles
        const missingRoles = reportData.crew.filter(member => !member.role);
        if (missingRoles.length > 0) {
            const missingUsers = missingRoles
                .map(m => interaction.client.users.cache.get(m.userId).username)
                .join(', ');
            await interaction.reply({
                content: `Please select roles for: ${missingUsers}`,
                ephemeral: true
            });
            return;
        }

        // Calculate total value
        const unitsPerBox = reportData.prices?.boxInfo?.unitsPerBox || 100;
        const totalUnits = reportData.boxes * unitsPerBox;
        const unitPrice = reportData.prices?.bestLocation?.price || 0;
        const totalValue = totalUnits * unitPrice;

        // Calculate shares based on role ratios
        const totalRatios = reportData.crew.reduce((sum, member) => 
            sum + database.roleRatios[member.role], 0);

        reportData.crew.forEach(member => {
            member.share = database.roleRatios[member.role] / totalRatios;
        });

        // Create confirmation embed
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('Crew Shares Calculated')
            .addFields(
                { 
                    name: '📦 Cargo Summary', 
                    value: [
                        `**Type**: ${reportData.commodity}`,
                        `**Boxes**: ${reportData.boxes} (${totalUnits} units)`,
                        `**Best Price**: ${tradeScraper.formatPrice(unitPrice)} aUEC/unit`,
                        `**Total Value**: ${tradeScraper.formatPrice(totalValue)} aUEC`
                    ].join('\n'),
                    inline: false 
                }
            );

        // Add crew shares
        reportData.crew.forEach(member => {
            const user = interaction.client.users.cache.get(member.userId);
            const ratio = database.roleRatios[member.role];
            const sharePercent = (member.share * 100).toFixed(1);
            const shareAmount = Math.floor(totalValue * member.share);
            embed.addFields({
                name: `${user.username} - ${member.role}`,
                value: `Ratio: ${ratio}x → ${sharePercent}% (${tradeScraper.formatPrice(shareAmount)} aUEC)`,
                inline: false
            });
        });

        if (reportData.notes) {
            embed.addFields({ name: '📝 Notes', value: reportData.notes, inline: false });
        }

        const confirmButton = new ButtonBuilder()
            .setCustomId('confirm_shares')
            .setLabel('Confirm & Submit Report')
            .setStyle(ButtonStyle.Success);

        const confirmRow = new ActionRowBuilder().addComponents(confirmButton);

        await interaction.update({
            content: 'Review calculated shares:',
            embeds: [embed],
            components: [confirmRow]
        });
    },

    async handleConfirmShares(interaction) {
        const reportData = interaction.client.reportData[interaction.user.id];

        try {
            // Calculate total value
            const unitsPerBox = reportData.prices?.boxInfo?.unitsPerBox || 100;
            const totalUnits = reportData.boxes * unitsPerBox;
            const unitPrice = reportData.prices?.bestLocation?.price || 0;
            const totalValue = totalUnits * unitPrice;

            // Save the report with required fields
            const reportId = await database.addReport({
                targetHandle: reportData.username,
                reporterId: interaction.user.id,
                cargoType: reportData.commodity,
                boxes: reportData.boxes,
                sellLocation: reportData.prices?.bestLocation?.name || 'TBD',
                currentPrice: unitPrice,
                notes: reportData.notes,
                guildId: interaction.guildId,
                sellerId: interaction.user.id
            });

            // Add piracy hit record
            await database.addPiracyHit(
                reportData.username,
                false,
                `Cargo stolen: ${reportData.boxes} boxes of ${reportData.commodity} (${tradeScraper.formatPrice(totalValue)} aUEC)`,
                null
            );

            // Save crew members
            for (const member of reportData.crew) {
                await database.addCrewMember({
                    hitId: reportId,
                    userId: member.userId,
                    share: member.share,
                    role: member.role
                });

                // If member is storage, save storage record
                if (member.role === 'storage') {
                    await database.setStorage({
                        hitId: reportId,
                        holderId: member.userId
                    });
                }
            }

            // Create success embed
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('Piracy Report Submitted')
                .setDescription(`Hit #${reportId} recorded against ${reportData.username}`)
                .addFields(
                    { 
                        name: '📦 Cargo', 
                        value: [
                            `**Type**: ${reportData.commodity}`,
                            `**Amount**: ${reportData.boxes} boxes (${totalUnits} units)`,
                            `**Price**: ${tradeScraper.formatPrice(unitPrice)} aUEC/unit`,
                            `**Total Value**: ${tradeScraper.formatPrice(totalValue)} aUEC`
                        ].join('\n'),
                        inline: false 
                    },
                    {
                        name: '👥 Crew',
                        value: reportData.crew.map(member => {
                            const user = interaction.client.users.cache.get(member.userId);
                            const sharePercent = (member.share * 100).toFixed(0);
                            const shareAmount = Math.floor(totalValue * member.share);
                            return `<@${member.userId}> - ${member.role} (${sharePercent}%) → ${tradeScraper.formatPrice(shareAmount)} aUEC`;
                        }).join('\n'),
                        inline: false
                    }
                )
                .setTimestamp();

            if (reportData.notes) {
                embed.addFields({ name: '📝 Notes', value: reportData.notes, inline: false });
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
    }
};
