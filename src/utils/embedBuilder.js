const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

class EmbedBuilderUtil {
    createProfileEmbed(profileData) {
        const embed = new EmbedBuilder()
            .setColor('#2f3136')
            .setTitle(`Star Citizen Profile: ${profileData.handle}`)
            .setURL(`https://robertsspaceindustries.com/citizens/${profileData.handle}`)
            .setTimestamp();

        // Set user avatar as thumbnail if available
        if (profileData.avatarUrl) {
            embed.setThumbnail(profileData.avatarUrl);
        }

        // Add basic profile information
        const fields = [
            { name: 'Handle', value: profileData.handle || 'N/A', inline: true },
            { name: 'Enlisted', value: profileData.enlisted || 'N/A', inline: true },
            { name: '\u200b', value: '\u200b', inline: true }
        ];

        // Add location if available
        if (profileData.location) {
            fields.push({ 
                name: 'Location', 
                value: profileData.location, 
                inline: false 
            });
        }

        // Add main organization information if available
        if (profileData.mainOrg) {
            if (profileData.mainOrg.isRedacted) {
                fields.push({
                    name: 'Main Organization',
                    value: '**[REDACTED]**',
                    inline: false
                });
            } else {
                // Main org info
                fields.push({
                    name: 'Main Organization',
                    value: [
                        `**Name**: [${profileData.mainOrg.name}](${profileData.mainOrg.url})`,
                        `**Rank**: ${profileData.mainOrg.rank}`,
                        `**Members**: ${profileData.mainOrg.memberCount}`,
                        `**Organization ID**: ${profileData.mainOrg.sid}`
                    ].join('\n'),
                    inline: true
                });

                // Add main org logo to the right
                if (profileData.mainOrg.logoUrl) {
                    fields.push({
                        name: '\u200b',
                        value: `[${profileData.mainOrg.name}](${profileData.mainOrg.logoUrl})`,
                        inline: true
                    });
                }

                // Add spacer for alignment
                fields.push({ name: '\u200b', value: '\u200b', inline: true });
            }
        }

        // Add affiliated organizations if any
        if (profileData.affiliatedOrgs && profileData.affiliatedOrgs.length > 0) {
            fields.push({
                name: 'Affiliated Organizations',
                value: '\u200b',
                inline: false
            });

            profileData.affiliatedOrgs.forEach((org, index) => {
                if (org.isRedacted) {
                    fields.push({
                        name: `${index + 1}. [REDACTED]`,
                        value: '\u200b',
                        inline: false
                    });
                } else {
                    // Org info
                    fields.push({
                        name: `${index + 1}. ${org.name}`,
                        value: [
                            `Rank: ${org.rank}`,
                            `Members: ${org.memberCount}`,
                            `Organization ID: ${org.sid}`
                        ].join('\n'),
                        inline: true
                    });

                    // Add org logo to the right
                    if (org.logoUrl) {
                        fields.push({
                            name: '\u200b',
                            value: `[${org.name}](${org.logoUrl})`,
                            inline: true
                        });
                    } else {
                        fields.push({
                            name: '\u200b',
                            value: '\u200b',
                            inline: true
                        });
                    }

                    // Add spacer for 2-column layout
                    fields.push({
                        name: '\u200b',
                        value: '\u200b',
                        inline: true
                    });
                }
            });
        }

        // Add all fields to embed
        embed.addFields(fields);

        return embed;
    }

    createErrorEmbed(error) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setTimestamp();

        if (error.message === 'Profile not found' && error.username) {
            embed.setDescription([
                '**Profile not found**',
                `Did you mean to type "${error.username}"?`,
                '',
                'Try checking:',
                '• Spelling of the username',
                '• Case sensitivity (some names are case-sensitive)',
                '• Special characters or spaces',
                '',
                'You can verify the handle at:',
                `https://robertsspaceindustries.com/citizens/${error.username}`
            ].join('\n'));
        } else {
            embed.setDescription(error.message);
        }

        return embed;
    }

    createReportButton() {
        const button = new ButtonBuilder()
            .setCustomId('report_piracy')
            .setLabel('🏴‍☠️ Report Piracy')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder()
            .addComponents(button);

        return row;
    }
}

module.exports = new EmbedBuilderUtil();
