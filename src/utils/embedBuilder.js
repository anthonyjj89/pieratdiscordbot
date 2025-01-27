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
            { name: 'Sign-up Date', value: profileData.signupDate || 'N/A', inline: true },
            { name: 'Enlisted', value: profileData.enlisted || 'N/A', inline: true }
        );

        // Add location if available
        if (profileData.location) {
            embed.addFields({ name: 'Location', value: profileData.location, inline: false });
        }

        // Add organization information if available
        if (profileData.organization) {
            const orgField = [
                `Name: [${profileData.organization.name}](${profileData.organization.url})`,
                `Rank: ${profileData.organization.rank}`,
                `Members: ${profileData.organization.memberCount}`,
                `Organization ID: ${profileData.organization.sid}`
            ].join('\n');

            embed.addFields({
                name: 'Organization',
                value: orgField,
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
