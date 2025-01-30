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
            // Store username for later steps
            interaction.client.reportData = interaction.client.reportData || {};
            interaction.client.reportData[interaction.user.id] = { username };

            // Create cargo details modal
            const modal = new ModalBuilder()
                .setCustomId('cargo_details_modal')
                .setTitle('Report Hit - Cargo Details');

            const commodityInput = new TextInputBuilder()
                .setCustomId('commodity')
                .setLabel('Cargo Type (e.g., SLAM, GOLD)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter cargo type')
                .setRequired(true);

            const boxesInput = new TextInputBuilder()
                .setCustomId('boxes')
                .setLabel('How many boxes?')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('e.g., 50')
                .setRequired(true);

            const locationInput = new TextInputBuilder()
                .setCustomId('location')
                .setLabel('Where will you sell?')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('e.g., CRU-L5')
                .setRequired(true);

            const notesInput = new TextInputBuilder()
                .setCustomId('notes')
                .setLabel('Additional notes')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('e.g., Location, circumstances...')
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(commodityInput),
                new ActionRowBuilder().addComponents(boxesInput),
                new ActionRowBuilder().addComponents(locationInput),
                new ActionRowBuilder().addComponents(notesInput)
            );

            await interaction.showModal(modal);

        } catch (error) {
            console.error('Error showing modal:', error);
            await interaction.reply({
                content: 'An error occurred while starting the report.',
                ephemeral: true
            });
        }
    },

    async handleCargoDetails(interaction) {
        const reportData = interaction.client.reportData[interaction.user.id];
        const commodity = interaction.fields.getTextInputValue('commodity').toUpperCase();
        const boxes = parseInt(interaction.fields.getTextInputValue('boxes'));
        const location = interaction.fields.getTextInputValue('location');
        const notes = interaction.fields.getTextInputValue('notes');

        if (isNaN(boxes) || boxes <= 0) {
            await interaction.reply({
                content: 'Please enter a valid number of boxes.',
                ephemeral: true
            });
            return;
        }

        // Store cargo details
        reportData.commodity = commodity;
        reportData.boxes = boxes;
        reportData.location = location;
        reportData.notes = notes;

        // Get price info
        const prices = await tradeScraper.getPrices(commodity);
        reportData.price = prices?.bestLocation?.price || 0;

        // Create crew modal
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

        modal.addComponents(
            new ActionRowBuilder().addComponents(crewInput),
            new ActionRowBuilder().addComponents(rolesInput)
        );

        await interaction.showModal(modal);
    },

    async handleCrewDetails(interaction) {
        const reportData = interaction.client.reportData[interaction.user.id];
        
        // Parse crew mentions and roles
        const crewText = interaction.fields.getTextInputValue('crew');
        const rolesText = interaction.fields.getTextInputValue('roles');

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
        crewIds.forEach((id, index) => {
            reportData.roles[id] = roles[index];
        });

        // Calculate shares
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

        const totalValue = reportData.boxes * 100 * reportData.price;
        const details = [
            `Target: ${reportData.username}`,
            `Cargo: ${reportData.boxes} boxes of ${reportData.commodity}`,
            `Location: ${reportData.location}`,
            `Total Value: ${tradeScraper.formatPrice(totalValue)} aUEC`,
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
            const totalValue = reportData.boxes * 100 * reportData.price;

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
