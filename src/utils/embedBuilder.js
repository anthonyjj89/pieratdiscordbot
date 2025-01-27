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
            { name: 'Enlisted', value: profileData.enlisted || 'N/A', inline: true }
        ];

        // Add spacer for alignment
        fields.push({ name: '\u200b', value: '\u200b', inline: true });

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
                    inline: false
                });

                // Set main org logo as main image
                if (profileData.mainOrg.logoUrl) {
                    embed.setImage(profileData.mainOrg.logoUrl);
                }
            }
        }

        // Add affiliated organizations if any
        if (profileData.affiliatedOrgs && profileData.affiliatedOrgs.length > 0) {
            const affiliatedOrgsField = profileData.affiliatedOrgs.map((org, index) => {
                if (org.isRedacted) {
                    return `${index + 1}. **[REDACTED]**`;
                }
                return [
                    `${index + 1}. **[${org.name}](${org.url})**`,
                    `   Rank: ${org.rank}`,
                    `   Members: ${org.memberCount}`,
                    `   Organization ID: ${org.sid}`,
                    org.logoUrl ? `   [View Logo](${org.logoUrl})` : ''
                ].filter(line => line).join('\n');
            }).join('\n\n');

            fields.push({
                name: 'Affiliated Organizations',
                value: affiliatedOrgsField,
                inline: false
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
