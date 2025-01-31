const { 
    SlashCommandBuilder, 
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const scraper = require('../services/scraper');
const embedBuilder = require('../utils/embedBuilder');
const database = require('../services/mongoDatabase');
const tradeScraper = require('../services/tradeScraper');

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
            // Initialize or reset report data
            interaction.client.reportData = interaction.client.reportData || {};
            interaction.client.reportData[interaction.user.id] = { 
                username,
                cargo: [],
                currentStep: 'commodity_select'
            };

            // Get list of commodities
            const commodities = await tradeScraper.getCommodities();
            
            // Filter to just common commodities
            const filteredCommodities = commodities
                .slice(0, 25)
                .map(commodity => ({
                    label: `${commodity.code} - ${commodity.name}`,
                    value: commodity.value,
                    description: commodity.avgPrice != null 
                        ? `Avg: ${tradeScraper.formatPrice(commodity.avgPrice)} aUEC/unit`
                        : 'Avg: N/A'
                }));
            
            // Create commodity select menu and search button
            const commoditySelect = new StringSelectMenuBuilder()
                .setCustomId('commodity_select')
                .setPlaceholder('Select cargo type')
                .addOptions(filteredCommodities);

            const searchButton = new ButtonBuilder()
                .setCustomId('search_commodity')
                .setLabel('🔍 Search Other Commodities')
                .setStyle(ButtonStyle.Secondary);

            const row1 = new ActionRowBuilder().addComponents(commoditySelect);
            const row2 = new ActionRowBuilder().addComponents(searchButton);

            await interaction.reply({
                content: 'Step 1: Select the type of cargo that was stolen\nOr use search to find other commodities',
                components: [row1, row2],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error showing add cargo button:', error);
            await interaction.reply({
                content: 'An error occurred while starting the report.',
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

    async handleSearchCommodity(interaction) {
        try {
            // Create search modal
            const modal = new ModalBuilder()
                .setCustomId('search_commodity_modal')
                .setTitle('Search Commodities');

            const searchInput = new TextInputBuilder()
                .setCustomId('search_term')
                .setLabel('Enter commodity name or code')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('e.g., SLAM or Widow')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(searchInput)
            );

            await interaction.showModal(modal);

        } catch (error) {
            console.error('Error showing search modal:', error);
            await interaction.reply({
                content: 'An error occurred while opening search.',
                ephemeral: true
            });
        }
    },

    async handleSearchModal(interaction) {
        try {
            const searchTerm = interaction.fields.getTextInputValue('search_term');
            const commodities = await tradeScraper.getCommodities();
            
            // Search and filter commodities
            const searchResults = tradeScraper.searchCommodities(commodities, searchTerm);
            
            if (searchResults.length === 0) {
                await interaction.reply({
                    content: 'No commodities found matching your search.',
                    ephemeral: true
                });
                return;
            }

            // Take top 25 results
            const filteredResults = searchResults
                .slice(0, 25)
                .map(commodity => ({
                    label: `${commodity.code} - ${commodity.name}`,
                    value: commodity.value,
                    description: commodity.avgPrice != null 
                        ? `Avg: ${tradeScraper.formatPrice(commodity.avgPrice)} aUEC/unit`
                        : 'Avg: N/A'
                }));

            // Create select menu with results
            const commoditySelect = new StringSelectMenuBuilder()
                .setCustomId('commodity_select')
                .setPlaceholder('Select cargo type')
                .addOptions(filteredResults);

            const searchButton = new ButtonBuilder()
                .setCustomId('search_commodity')
                .setLabel('🔍 Search Again')
                .setStyle(ButtonStyle.Secondary);

            const backButton = new ButtonBuilder()
                .setCustomId('back_to_common')
                .setLabel('⬅️ Back to Common')
                .setStyle(ButtonStyle.Secondary);

            const row1 = new ActionRowBuilder().addComponents(commoditySelect);
            const row2 = new ActionRowBuilder().addComponents(searchButton, backButton);

            const resultCount = searchResults.length;
            const message = resultCount > 25 
                ? `Found ${resultCount} matches. Showing top 25 results:`
                : `Found ${resultCount} matches:`;

            await interaction.reply({
                content: message,
                components: [row1, row2],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error handling search:', error);
            await interaction.reply({
                content: 'An error occurred while searching.',
                ephemeral: true
            });
        }
    },

    async handleBackToCommon(interaction) {
        try {
            // Get list of commodities
            const commodities = await tradeScraper.getCommodities();
            
            // Filter to just common commodities
            const filteredCommodities = commodities
                .slice(0, 25)
                .map(commodity => ({
                    label: `${commodity.code} - ${commodity.name}`,
                    value: commodity.value,
                    description: commodity.avgPrice != null 
                        ? `Avg: ${tradeScraper.formatPrice(commodity.avgPrice)} aUEC/unit`
                        : 'Avg: N/A'
                }));
            
            // Create commodity select menu and search button
            const commoditySelect = new StringSelectMenuBuilder()
                .setCustomId('commodity_select')
                .setPlaceholder('Select cargo type')
                .addOptions(filteredCommodities);

            const searchButton = new ButtonBuilder()
                .setCustomId('search_commodity')
                .setLabel('🔍 Search Other Commodities')
                .setStyle(ButtonStyle.Secondary);

            const row1 = new ActionRowBuilder().addComponents(commoditySelect);
            const row2 = new ActionRowBuilder().addComponents(searchButton);

            await interaction.update({
                content: 'Step 1: Select the type of cargo that was stolen\nOr use search to find other commodities',
                components: [row1, row2],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error returning to common list:', error);
            await interaction.reply({
                content: 'An error occurred while returning to common commodities.',
                ephemeral: true
            });
        }
    },

    async handleAddMoreCargo(interaction) {
        try {
            // Get list of commodities
            const commodities = await tradeScraper.getCommodities();
            
            // Filter to just common commodities
            const filteredCommodities = commodities
                .slice(0, 25)
                .map(commodity => ({
                    label: `${commodity.code} - ${commodity.name}`,
                    value: commodity.value,
                    description: commodity.avgPrice != null 
                        ? `Avg: ${tradeScraper.formatPrice(commodity.avgPrice)} aUEC/unit`
                        : 'Avg: N/A'
                }));
            
            // Create commodity select menu and search button
            const commoditySelect = new StringSelectMenuBuilder()
                .setCustomId('commodity_select')
                .setPlaceholder('Select additional cargo type')
                .addOptions(filteredCommodities);

            const searchButton = new ButtonBuilder()
                .setCustomId('search_commodity')
                .setLabel('🔍 Search Other Commodities')
                .setStyle(ButtonStyle.Secondary);

            const row1 = new ActionRowBuilder().addComponents(commoditySelect);
            const row2 = new ActionRowBuilder().addComponents(searchButton);

            await interaction.update({
                content: 'Add more cargo:',
                components: [row1, row2],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error showing add cargo button:', error);
            await interaction.reply({
                content: 'An error occurred while adding more cargo.',
                ephemeral: true
            });
        }
    },

    async handleContinueToCrew(interaction) {
        const reportData = interaction.client.reportData[interaction.user.id];
        
        // Create crew selection modal
        const modal = new ModalBuilder()
            .setCustomId('crew_details_modal')
            .setTitle('Report Hit - Crew Details');

        const crewInput = new TextInputBuilder()
            .setCustomId('crew')
            .setLabel('Crew Members (mention with @)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('@pilot @gunner @boarder')
            .setRequired(true);

        const rolesInput = new TextInputBuilder()
            .setCustomId('roles')
            .setLabel('Roles (pilot/gunner/boarder/escort/storage)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('pilot\ngunner\nboarder')
            .setRequired(true);

        const notesInput = new TextInputBuilder()
            .setCustomId('notes')
            .setLabel('Additional notes')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('e.g., Location, circumstances...')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(crewInput),
            new ActionRowBuilder().addComponents(rolesInput),
            new ActionRowBuilder().addComponents(notesInput)
        );

        await interaction.showModal(modal);
    },

    async handleCrewDetails(interaction) {
        const reportData = interaction.client.reportData[interaction.user.id];
        
        // Parse crew mentions and roles
        const crewText = interaction.fields.getTextInputValue('crew');
        const rolesText = interaction.fields.getTextInputValue('roles');
        const notes = interaction.fields.getTextInputValue('notes');

        const crewIds = crewText.match(/<@(\d+)>/g)?.map(mention => mention.match(/\d+/)[0]) || [];
        const roles = rolesText.split('\n').map(role => role.trim().toLowerCase());

        if (crewIds.length === 0) {
            await interaction.reply({
                content: 'Please mention at least one crew member with @.',
                ephemeral: true
            });
            return;
        }

        if (crewIds.length !== roles.length) {
            await interaction.reply({
                content: 'Number of crew members and roles must match.',
                ephemeral: true
            });
            return;
        }

        // Validate roles
        const validRoles = ['pilot', 'gunner', 'boarder', 'escort', 'storage', 'general_crew'];
        if (!roles.every(role => validRoles.includes(role))) {
            await interaction.reply({
                content: 'Invalid role(s). Use: pilot, gunner, boarder, escort, storage, or general_crew',
                ephemeral: true
            });
            return;
        }

        // Store crew details
        reportData.crew = crewIds;
        reportData.roles = {};
        reportData.notes = notes;
        crewIds.forEach((id, index) => {
            reportData.roles[id] = roles[index];
        });

        // Calculate total value and shares
        const totalValue = reportData.cargo.reduce((sum, cargo) => {
            return sum + (cargo.scu * 100 * cargo.currentPrice);
        }, 0);

        const totalRatios = crewIds.reduce((sum, id) => 
            sum + database.roleRatios[reportData.roles[id]], 0);

        crewIds.forEach(id => {
            const roleRatio = database.roleRatios[reportData.roles[id]];
            reportData.roles[`${id}_share`] = roleRatio / totalRatios;
        });

        // Create confirmation modal
        const modal = new ModalBuilder()
            .setCustomId('confirm_report_modal')
            .setTitle('Report Hit - Confirm Details');

        // Format cargo details
        const cargoDetails = reportData.cargo.map(cargo => 
            `${cargo.scu} SCU of ${cargo.cargoType} at ${cargo.sellLocation}`
        ).join('\n');

        const details = [
            `Target: ${reportData.username}`,
            '\nCargo:',
            cargoDetails,
            `\nTotal Value: ${tradeScraper.formatPrice(totalValue)} aUEC`,
            '\nCrew Shares:',
            ...crewIds.map(id => {
                const role = reportData.roles[id];
                const share = reportData.roles[`${id}_share`];
                const amount = Math.floor(totalValue * share);
                return `<@${id}> - ${role} → ${tradeScraper.formatPrice(amount)} aUEC`;
            })
        ].join('\n');

        const confirmInput = new TextInputBuilder()
            .setCustomId('confirm')
            .setLabel('Review details and type YES to confirm')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Type YES to confirm')
            .setRequired(true);

        const detailsInput = new TextInputBuilder()
            .setCustomId('details')
            .setLabel('Report Details')
            .setStyle(TextInputStyle.Paragraph)
            .setValue(details)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(confirmInput),
            new ActionRowBuilder().addComponents(detailsInput)
        );

        await interaction.showModal(modal);
    },

    async handleConfirmReport(interaction) {
        const reportData = interaction.client.reportData[interaction.user.id];
        const confirm = interaction.fields.getTextInputValue('confirm');

        if (confirm !== 'YES') {
            await interaction.reply({
                content: 'Report cancelled.',
                ephemeral: true
            });
            return;
        }

        try {
            // Calculate total value
            const totalValue = reportData.cargo.reduce((sum, cargo) => {
                return sum + (cargo.scu * 100 * cargo.currentPrice);
            }, 0);

            // Save the report
            const reportId = await database.addReport({
                targetHandle: reportData.username,
                reporterId: interaction.user.id,
                cargo: reportData.cargo,
                notes: reportData.notes,
                guildId: interaction.guildId,
                sellerId: reportData.crew[0] // First crew member is seller by default
            });

            // Add piracy hit record
            const cargoSummary = reportData.cargo.map(cargo => 
                `${cargo.scu} SCU of ${cargo.cargoType}`
            ).join(', ');
            await database.addPiracyHit(
                reportData.username,
                false,
                `Cargo stolen: ${cargoSummary}`,
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
                .setDescription(`Hit #${reportId} recorded against ${reportData.username}`);

            // Add cargo fields
            reportData.cargo.forEach((cargo, index) => {
                const value = cargo.scu * 100 * cargo.currentPrice;
                embed.addFields({
                    name: `📦 Cargo ${index + 1}`,
                    value: [
                        `**Type**: ${cargo.cargoType}`,
                        `**Amount**: ${cargo.scu} SCU`,
                        `**Location**: ${cargo.sellLocation}`,
                        `**Value**: ${tradeScraper.formatPrice(value)} aUEC`
                    ].join('\n'),
                    inline: false
                });
            });

            // Add crew and total value
            embed.addFields(
                {
                    name: '💰 Total Value',
                    value: tradeScraper.formatPrice(totalValue) + ' aUEC',
                    inline: false
                },
                {
                    name: '👥 Crew Shares',
                    value: reportData.crew.map(userId => {
                        const role = reportData.roles[userId];
                        const share = reportData.roles[`${userId}_share`];
                        const shareAmount = Math.floor(totalValue * share);
                        return `<@${userId}> - ${role} → ${tradeScraper.formatPrice(shareAmount)} aUEC`;
                    }).join('\n'),
                    inline: false
                }
            );

            if (reportData.notes) {
                embed.addFields({ 
                    name: '📝 Notes', 
                    value: reportData.notes, 
                    inline: false 
                });
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
