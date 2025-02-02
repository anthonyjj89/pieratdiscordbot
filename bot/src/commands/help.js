const { 
    SlashCommandBuilder, 
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    UserSelectMenuBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('List all available commands and features'),

    async execute(interaction) {
        // Create main help embed
        const helpEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('📚 Available Commands')
            .setDescription('Click the buttons below to use any command!')
            .addFields(
                {
                    name: '🏴‍☠️ Piracy Reports',
                    value: [
                        '`/lookup` - Look up a player\'s profile and piracy history',
                        '`/hits report` - Report a new piracy hit',
                        '`/hits list` - View all piracy reports'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '💰 Financial',
                    value: [
                        '`/balance` - Check your earnings and payments',
                        '`/pay` - Record payments to crew members'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🏪 Market Data',
                    value: '`/pricecheck` - Check current commodity prices',
                    inline: false
                }
            )
            .setFooter({ text: 'Use the buttons below to quickly access any command' });

        // Create buttons for each command
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('cmd_lookup')
                .setLabel('Lookup Player')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔍'),
            new ButtonBuilder()
                .setCustomId('cmd_hits_report')
                .setLabel('Report Hit')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🏴‍☠️'),
            new ButtonBuilder()
                .setCustomId('cmd_hits_list')
                .setLabel('List Hits')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📋')
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('cmd_balance')
                .setLabel('Check Balance')
                .setStyle(ButtonStyle.Success)
                .setEmoji('💰'),
            new ButtonBuilder()
                .setCustomId('cmd_pay')
                .setLabel('Record Payment')
                .setStyle(ButtonStyle.Success)
                .setEmoji('💸'),
            new ButtonBuilder()
                .setCustomId('cmd_pricecheck')
                .setLabel('Price Check')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🏪')
        );

        await interaction.reply({
            embeds: [helpEmbed],
            components: [row1, row2]
        });
    },

    async handleButton(interaction) {
        // Get the command from the button ID
        const commandName = interaction.customId.replace('cmd_', '');
        
        try {
            switch (commandName) {
                case 'lookup': {
                    // Show modal for lookup
                    const lookupModal = new ModalBuilder()
                        .setCustomId('help_lookup_modal')
                        .setTitle('Lookup Player');

                    const usernameInput = new TextInputBuilder()
                        .setCustomId('username')
                        .setLabel('Player Handle')
                        .setStyle(TextInputStyle.Short)
                        .setMinLength(1)
                        .setMaxLength(100)
                        .setPlaceholder('Enter Star Citizen handle')
                        .setRequired(true);

                    const lookupActionRow = new ActionRowBuilder().addComponents(usernameInput);
                    lookupModal.addComponents(lookupActionRow);

                    await interaction.showModal(lookupModal);
                    break;
                }

                case 'hits_report': {
                    // Execute hits report command directly
                    const hitsCommand = interaction.client.commands.get('hits');
                    await hitsCommand.execute({
                        ...interaction,
                        options: {
                            getSubcommand: () => 'report',
                            getString: (name) => {
                                if (name === 'target') return null;
                                if (name === 'commodity') return null;
                            }
                        }
                    });
                    break;
                }

                case 'hits_list': {
                    // Execute hits list command directly
                    const hitsCommand = interaction.client.commands.get('hits');
                    await hitsCommand.execute({
                        ...interaction,
                        options: {
                            getSubcommand: () => 'list',
                            getInteger: () => 1
                        }
                    });
                    break;
                }

                case 'balance': {
                    // Execute balance command directly
                    const balanceCommand = interaction.client.commands.get('balance');
                    await balanceCommand.execute({
                        ...interaction,
                        options: {
                            getUser: () => interaction.user
                        }
                    });
                    break;
                }

                case 'pay': {
                    // Show modal for payment
                    const payModal = new ModalBuilder()
                        .setCustomId('help_pay_modal')
                        .setTitle('Record Payment');

                    const hitIdInput = new TextInputBuilder()
                        .setCustomId('hit_id')
                        .setLabel('Hit ID')
                        .setStyle(TextInputStyle.Short)
                        .setMinLength(1)
                        .setMaxLength(10)
                        .setPlaceholder('Enter hit ID')
                        .setRequired(true);

                    const amountInput = new TextInputBuilder()
                        .setCustomId('amount')
                        .setLabel('Amount (aUEC)')
                        .setStyle(TextInputStyle.Short)
                        .setMinLength(1)
                        .setMaxLength(20)
                        .setPlaceholder('Enter payment amount')
                        .setRequired(true);

                    const payActionRow1 = new ActionRowBuilder().addComponents(hitIdInput);
                    const payActionRow2 = new ActionRowBuilder().addComponents(amountInput);
                    payModal.addComponents(payActionRow1, payActionRow2);

                    await interaction.showModal(payModal);
                    break;
                }

                case 'pricecheck': {
                    // Execute pricecheck command directly
                    const pricecheckCommand = interaction.client.commands.get('pricecheck');
                    await pricecheckCommand.execute(interaction);
                    break;
                }
            }
        } catch (error) {
            console.error('Error handling help button:', error);
            await interaction.reply({
                content: 'An error occurred while processing your request.',
                ephemeral: true
            });
        }
    },

    async handleModalSubmit(interaction) {
        try {
            const modalId = interaction.customId;
            
            switch (modalId) {
                case 'help_lookup_modal': {
                    const username = interaction.fields.getTextInputValue('username');
                    const lookupCommand = interaction.client.commands.get('lookup');
                    await lookupCommand.execute({
                        ...interaction,
                        options: {
                            getString: () => username
                        }
                    });
                    break;
                }


                case 'help_pay_modal': {
                    const hitId = parseInt(interaction.fields.getTextInputValue('hit_id'));
                    const amount = parseInt(interaction.fields.getTextInputValue('amount'));
                    
                    if (isNaN(hitId) || isNaN(amount)) {
                        await interaction.reply({
                            content: 'Please enter valid numbers for Hit ID and Amount.',
                            ephemeral: true
                        });
                        return;
                    }

                    // Show user selection for payment
                    const userSelect = new UserSelectMenuBuilder()
                        .setCustomId('help_pay_user_select')
                        .setPlaceholder('Select payment recipient')
                        .setMinValues(1)
                        .setMaxValues(1);

                    const selectRow = new ActionRowBuilder().addComponents(userSelect);

                    // Store payment details for when user is selected
                    interaction.client.paymentData = interaction.client.paymentData || {};
                    interaction.client.paymentData[interaction.user.id] = {
                        hitId,
                        amount
                    };

                    await interaction.reply({
                        content: 'Select who will receive the payment:',
                        components: [selectRow],
                        ephemeral: true
                    });
                    break;
                }
            }
        } catch (error) {
            console.error('Error handling help modal submit:', error);
            await interaction.reply({
                content: 'An error occurred while processing your request.',
                ephemeral: true
            });
        }
    },

    async handleUserSelect(interaction) {
        if (interaction.customId === 'help_pay_user_select') {
            try {
                const paymentData = interaction.client.paymentData[interaction.user.id];
                const receiver = interaction.values[0];

                const payCommand = interaction.client.commands.get('pay');
                await payCommand.execute({
                    ...interaction,
                    options: {
                        getUser: () => interaction.client.users.cache.get(receiver),
                        getInteger: (name) => name === 'hit' ? paymentData.hitId : paymentData.amount
                    }
                });

                // Clean up
                delete interaction.client.paymentData[interaction.user.id];

            } catch (error) {
                console.error('Error handling payment user select:', error);
                await interaction.reply({
                    content: 'An error occurred while processing the payment.',
                    ephemeral: true
                });
            }
        }
    }
};
