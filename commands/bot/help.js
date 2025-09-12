const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bot-help')
    .setDescription('Affiche toutes les commandes du bot par catégorie'),

  async execute(interaction, client) {
    // Détecte toutes les catégories dans /commands
    const commandsPath = path.join(__dirname, '..'); // remonte à /commands
    const categories = fs.readdirSync(commandsPath).filter(folder => fs.lstatSync(path.join(commandsPath, folder)).isDirectory());

    // Crée le menu déroulant
    const menu = new StringSelectMenuBuilder()
      .setCustomId('help-menu')
      .setPlaceholder('Sélectionne une catégorie')
      .addOptions(
        categories.map(cat => ({
          label: cat.charAt(0).toUpperCase() + cat.slice(1),
          value: cat,
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);

    // Embed initial
    const embed = new EmbedBuilder()
      .setTitle('📋 Menu Help')
      .setDescription('Sélectionne une catégorie dans le menu déroulant ci-dessous pour voir les commandes.')
      .setColor('#00FFFF')
      .setImage('https://cdn.discordapp.com/attachments/1415314216382107680/1415745567598055444/ll_1.jpg');

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: false });

    // Collecteur pour le menu
    const collector = interaction.channel.createMessageComponentCollector({
      componentType: 3, // StringSelect
      time: 60000 // 60 secondes
    });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: '❌ Ce menu n’est pas pour toi.', ephemeral: true });
      }

      const cat = i.values[0];
      const commandFiles = fs.readdirSync(path.join(commandsPath, cat)).filter(f => f.endsWith('.js'));

      const commandsList = commandFiles.map(f => {
        const cmd = require(path.join(commandsPath, cat, f));
        return `\`/${cat} ${cmd.data.name}\` : ${cmd.data.description}`;
      }).join('\n');

      const embedCat = new EmbedBuilder()
        .setTitle(`📂 ${cat.charAt(0).toUpperCase() + cat.slice(1)} Commands`)
        .setDescription(commandsList || 'Aucune commande.')
        .setColor('#00FFFF');

      await i.update({ embeds: [embedCat], components: [row] });
    });

    collector.on('end', async () => {
      // Disable menu après expiration
      const disabledRow = new ActionRowBuilder().addComponents(menu.setDisabled(true));
      await interaction.editReply({ components: [disabledRow] });
    });
  },
};