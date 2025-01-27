const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../services/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Record a payment to another user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User receiving the payment')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount in aUEC')
                .setRequired(true)
                .setMinValue(1))
        .addIntegerOption(option =>
            option.setName('hit')
                .setDescription('Hit ID the payment is for')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const receiver = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            const hitId = interaction.options.getInteger('hit');

            // Record the payment
            await database.addPayment({
                hitId,
                payerId: interaction.user.id,
                receiverId: receiver.id,
                amount
            });

            // Get updated balance
            const balance = await database.getUserBalance(receiver.id, interaction.guildId);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('Payment Recorded')
                .setDescription(`💰 Payment of ${amount.toLocaleString()} aUEC sent to ${receiver.username}`)
                .addFields(
                    { 
                        name: 'From', 
                        value: `<@${interaction.user.id}>`, 
                        inline: true 
                    },
                    { 
                        name: 'To', 
                        value: `<@${receiver.id}>`, 
                        inline: true 
                    },
                    { 
                        name: 'Hit ID', 
                        value: `#${hitId}`, 
                        inline: true 
                    },
                    {
                        name: 'Receiver\'s Updated Balance',
                        value: `Total Received: ${balance.total_received.toLocaleString()} aUEC\nRemaining: ${(balance.total_share - balance.total_received).toLocaleString()} aUEC`,
                        inline: false
                    }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error recording payment:', error);
            await interaction.editReply({
                content: 'An error occurred while recording the payment. Make sure the hit ID exists and you have permission to record payments.',
                ephemeral: true
            });
        }
    }
};
