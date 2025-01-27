const { EmbedBuilder } = require('discord.js');

class EmbedBuilderUtil {
    createProfileEmbed(profileData) {
        const embed = new EmbedBuilder()
            .setColor('#2f3136')
            .setTitle(`Star Citizen Profile: ${profileData.handle}`)
            .setURL(`https://robertsspaceindustries.com/citizens/${profileData.handle}`)
            .setTimestamp();

        // Add basic profile information
        embed.addFields(
            { name: 'Handle', value: profileData.handle || 'N/A', inline: true },
            { name: 'Enlisted', value: profileData.enlisted || 'N/A', inline: true },
            { name: 'Location', value: profileData.location || 'N/A', inline: true }
        );

        // Add organization information if available
        if (profileData.organization) {
            embed.addFields({
                name: 'Organization',
                value: `${profileData.organization.name} (${profileData.organization.rank})`,
                inline: false
            });
        } else {
            embed.addFields({
                name: 'Organization',
                value: 'No organization',
                inline: false
            });
        }

        return embed;
    }

    createErrorEmbed(error) {
        return new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Error')
            .setDescription(error.message)
            .setTimestamp();
    }
}

module.exports = new EmbedBuilderUtil();
