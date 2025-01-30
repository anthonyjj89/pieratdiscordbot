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
const database = require('../services/database');

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
        // Step 1: Show cargo details modal
        const modal = new ModalBuilder()
            .setCustomId(`piracy_report_${username}`)
            .setTitle('Report Piracy - Step 1: Cargo');

        const cargoTypeInput = new TextInputBuilder()
            .setCustomId('cargo_type')
            .setLabel('What cargo was stolen?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., Titanium, Medical Supplies')
            .setRequired(true);

        const amountInput = new TextInputBuilder()
            .setCustomId('amount')
            .setLabel('How much cargo was stolen?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., 50000')
            .setRequired(true);

        const notesInput = new TextInputBuilder()
            .setCustomId('notes')
            .setLabel('Additional notes')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('e.g., Location, circumstances...')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(cargoTypeInput),
            new ActionRowBuilder().addComponents(amountInput),
            new ActionRowBuilder().addComponents(notesInput)
        );

        try {
            // Store the username for later steps
            interaction.client.reportData = interaction.client.reportData || {};
            interaction.client.reportData[interaction.user.id] = { username };

            await interaction.showModal(modal);
        } catch (error) {
            console.error('Error showing modal:', error);
            await interaction.reply({
                content: 'An error occurred while opening the report form.',
                ephemeral: true
            });
        }
    },

    async handleModalSubmit(interaction) {
        const reportData = interaction.client.reportData[interaction.user.id];
        
        // Get cargo details from modal
        const cargoType = interaction.fields.getTextInputValue('cargo_type');
        const amount = parseInt(interaction.fields.getTextInputValue('amount'));
        const notes = interaction.fields.getTextInputValue('notes');

        if (isNaN(amount)) {
            await interaction.reply({
                content: 'Invalid amount entered. Please enter a number.',
                ephemeral: true
            });
            return;
        }

        // Store cargo details
        reportData.cargoType = cargoType;
        reportData.amount = amount;
        reportData.notes = notes;

        // Step 2: Show crew selection
        const crewSelect = new UserSelectMenuBuilder()
            .setCustomId('crew_select')
            .setPlaceholder('Select crew members')
            .setMinValues(1)
            .setMaxValues(5);

        const roleSelect = new StringSelectMenuBuilder()
            .setCustomId('role_select')
            .setPlaceholder('Select roles')
            .addOptions([
                { label: 'Pilot', value: 'pilot', description: 'Flew the ship' },
                { label: 'Gunner', value: 'gunner', description: 'Operated weapons' },
                { label: 'Storage', value: 'storage', description: 'Storing the cargo' }
            ]);

        const nextButton = new ButtonBuilder()
            .setCustomId('crew_next')
            .setLabel('Next: Set Shares')
            .setStyle(ButtonStyle.Primary);

        const crewRow = new ActionRowBuilder().addComponents(crewSelect);
        const roleRow = new ActionRowBuilder().addComponents(roleSelect);
        const buttonRow = new ActionRowBuilder().addComponents(nextButton);

        await interaction.reply({
            content: 'Step 2: Select crew members and their roles',
            components: [crewRow, roleRow, buttonRow],
            ephemeral: true
        });
    },

    async handleCrewSelect(interaction) {
        const reportData = interaction.client.reportData[interaction.user.id];
        const selectedUsers = interaction.values;
        const role = interaction.message.components[1].components[0].options.find(
            opt => opt.value === interaction.values[0]
        )?.label;

        reportData.crew = reportData.crew || [];
        selectedUsers.forEach(userId => {
            const existingMember = reportData.crew.find(m => m.userId === userId);
            if (existingMember) {
                existingMember.role = role;
            } else {
                reportData.crew.push({ userId, role, share: 0 });
            }
        });

        await interaction.update({
            content: `Crew members selected with role ${role}. Select more or click Next to set shares.`,
            components: interaction.message.components
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

        // Step 3: Show share assignment modal
        const modal = new ModalBuilder()
            .setCustomId('shares_modal')
            .setTitle('Set Crew Shares');

        reportData.crew.forEach((member, index) => {
            const user = interaction.client.users.cache.get(member.userId);
            const shareInput = new TextInputBuilder()
                .setCustomId(`share_${index}`)
                .setLabel(`${user.username} (${member.role}) share %`)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter percentage (e.g., 25)')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(shareInput));
        });

        await interaction.showModal(modal);
    },

    async handleSharesSubmit(interaction) {
        const reportData = interaction.client.reportData[interaction.user.id];

        // Get shares from modal
        reportData.crew.forEach((member, index) => {
            const share = parseFloat(interaction.fields.getTextInputValue(`share_${index}`)) / 100;
            member.share = share;
        });

        // Validate total shares = 100%
        const totalShares = reportData.crew.reduce((sum, member) => sum + member.share, 0);
        if (Math.abs(totalShares - 1) > 0.01) {
            await interaction.reply({
                content: 'Total shares must equal 100%. Please try again.',
                ephemeral: true
            });
            return;
        }

        try {
            // Save the report
            const reportId = await database.addReport({
                targetHandle: reportData.username,
                reporterId: interaction.user.id,
                cargoType: reportData.cargoType,
                amount: reportData.amount,
                notes: reportData.notes,
                guildId: interaction.guildId
            });

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
                        name: 'Cargo', 
                        value: `${reportData.amount.toLocaleString()} ${reportData.cargoType}`,
                        inline: false 
                    },
                    {
                        name: 'Crew',
                        value: reportData.crew.map(member => {
                            const user = interaction.client.users.cache.get(member.userId);
                            return `<@${member.userId}> - ${member.role} (${(member.share * 100).toFixed(0)}%)`;
                        }).join('\n'),
                        inline: false
                    }
                )
                .setTimestamp();

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
    }
};
