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
            
            // Create main profile embed
            const embed = embedBuilder.createProfileEmbed(profileData);
            
            // Create report button
            const reportButton = embedBuilder.createReportButton();

            // Send embed with button
            await interaction.editReply({
                embeds: [embed],
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
