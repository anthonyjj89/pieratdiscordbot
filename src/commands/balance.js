const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../services/mongoDatabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check piracy earnings and payments')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check balance for (defaults to you)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const balance = await database.getUserBalance(targetUser.id, interaction.guildId);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`Balance for ${targetUser.username}`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            // Calculate total owed
            const totalOwed = balance.total_share - balance.total_received;

            embed.addFields(
                { 
                    name: 'Total Share Value', 
                    value: `${balance.total_share.toLocaleString()} aUEC`, 
                    inline: true 
                },
                { 
                    name: 'Total Received', 
                    value: `${balance.total_received.toLocaleString()} aUEC`, 
                    inline: true 
                },
                { 
                    name: 'Balance Owed', 
                    value: `${totalOwed.toLocaleString()} aUEC`, 
                    inline: false 
                }
            );

            if (totalOwed <= 0) {
                embed.setDescription('✅ All payments are up to date!');
            } else {
                embed.setDescription('💰 Outstanding balance needs to be paid.');
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error checking balance:', error);
            await interaction.editReply({
                content: 'An error occurred while checking the balance.',
                ephemeral: true
            });
        }
    }
};
