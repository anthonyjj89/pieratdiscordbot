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
        embed.addFields(
            { name: 'Handle', value: profileData.handle || 'N/A', inline: true },
            { name: 'Enlisted', value: profileData.enlisted || 'N/A', inline: true }
        );

        // Add location if available
        if (profileData.location) {
            embed.addFields({ 
                name: 'Location', 
                value: profileData.location, 
                inline: false 
            });
        }

        // Add main organization information if available
        if (profileData.mainOrg) {
            let mainOrgField;
            
            if (profileData.mainOrg.isRedacted) {
                mainOrgField = '**[REDACTED]**';
            } else {
                mainOrgField = [
                    `**Name**: [${profileData.mainOrg.name}](${profileData.mainOrg.url})`,
                    `**Rank**: ${profileData.mainOrg.rank}`,
                    `**Members**: ${profileData.mainOrg.memberCount}`,
                    `**Organization ID**: ${profileData.mainOrg.sid}`
                ].join('\n');

                // Set main org logo as main image if available
                if (profileData.mainOrg.logoUrl) {
                    embed.setImage(profileData.mainOrg.logoUrl);
                }
            }

            embed.addFields({
                name: 'Main Organization',
                value: mainOrgField,
                inline: false
            });
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
                    `   Organization ID: ${org.sid}`
                ].join('\n');
            }).join('\n\n');

            embed.addFields({
                name: 'Affiliated Organizations',
                value: affiliatedOrgsField,
                inline: false
            });
        }

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
