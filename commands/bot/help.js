const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const embedConfig = require('../../utils/embedConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche toutes les commandes du bot par catégorie avec un menu interactif'),

  async execute(interaction, client) {
    // Détecte toutes les catégories dans /commands
    const commandsPath = path.join(__dirname, '..');
    const categories = fs.readdirSync(commandsPath).filter(folder => fs.lstatSync(path.join(commandsPath, folder)).isDirectory());

    // Utiliser les emojis de la configuration
    const categoryEmojis = embedConfig.categoryEmojis;

    // Crée le menu déroulant
    const menu = new StringSelectMenuBuilder()
      .setCustomId('help-menu')
      .setPlaceholder('🔍 Sélectionne une catégorie...')
      .addOptions(
        categories.map(cat => ({
          label: `${categoryEmojis[cat] || '📁'} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
          value: cat,
          description: `Voir les commandes ${cat}`
        }))
      );

    // Boutons de navigation
    const homeButton = new ButtonBuilder()
      .setCustomId('help-home')
      .setLabel('🏠 Accueil')
      .setStyle(ButtonStyle.Primary);

    const refreshButton = new ButtonBuilder()
      .setCustomId('help-refresh')
      .setLabel('🔄 Actualiser')
      .setStyle(ButtonStyle.Secondary);

    const row1 = new ActionRowBuilder().addComponents(menu);
    const row2 = new ActionRowBuilder().addComponents(homeButton, refreshButton);

    // Embed initial avec le nouveau système
    const embed = embedConfig.createEmbedWithFooter(
      'bot',
      '📋 Centre d\'aide - Nira Bot',
      `**Bienvenue dans le centre d'aide !**\n\n🎯 **${client.commands.size}** commandes disponibles dans **${categories.length}** catégories\n\nUtilise le menu déroulant ci-dessous pour explorer les commandes par catégorie.`,
      interaction.user
    )
    .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { 
        name: '📊 Statistiques du Bot', 
        value: `**Serveurs:** \`${client.guilds.cache.size}\`\n**Utilisateurs:** \`${client.users.cache.size}\`\n**Uptime:** \`${Math.floor(client.uptime / 1000 / 60)}min\``, 
        inline: true 
      },
      { 
        name: '🔧 Support & Aide', 
        value: '**Besoin d\'aide ?**\nRejoins notre [serveur Discord](https://discord.gg/your-server)\n\n**Commandes populaires:**\n\`/ping\` - Vérifier la latence\n\`/avatar\` - Voir l\'avatar', 
        inline: true 
      },
      {
        name: '🎨 Fonctionnalités',
        value: `**${categories.length}** catégories disponibles\n**${client.commands.size}** commandes totales\n**Interactif** - Menu déroulant`,
        inline: true
      }
    );

    await interaction.reply({ embeds: [embed], components: [row1, row2] });

    // Collecteur pour les interactions
    const collector = interaction.channel.createMessageComponentCollector({
      time: 300000 // 5 minutes
    });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: '❌ Ce menu n\'est pas pour toi.', ephemeral: true });
      }

      if (i.isStringSelectMenu()) {
        const cat = i.values[0];
        const commandFiles = fs.readdirSync(path.join(commandsPath, cat)).filter(f => f.endsWith('.js'));

        const commandsList = commandFiles.map(f => {
          const cmd = require(path.join(commandsPath, cat, f));
          return `\`/${cmd.data.name}\` - ${cmd.data.description}`;
        }).join('\n');

        const embedCat = embedConfig.createEmbedWithFooter(
          cat,
          `${categoryEmojis[cat] || '📁'} Commandes ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
          commandsList || 'Aucune commande disponible dans cette catégorie.',
          interaction.user,
          `${commandFiles.length} commande(s) • ${interaction.user.username}`
        )
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }));

        await i.update({ embeds: [embedCat], components: [row1, row2] });
      }

      if (i.isButton()) {
        if (i.customId === 'help-home') {
          await i.update({ embeds: [embed], components: [row1, row2] });
        } else if (i.customId === 'help-refresh') {
          const newEmbed = embedConfig.createEmbedWithFooter(
            'bot',
            '🔄 Centre d\'aide - Actualisé',
            `**Centre d'aide actualisé !**\n\n🎯 **${client.commands.size}** commandes disponibles dans **${categories.length}** catégories\n\nUtilise le menu déroulant ci-dessous pour explorer les commandes par catégorie.`,
            interaction.user,
            `Actualisé par ${interaction.user.username}`
          )
          .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { 
              name: '📊 Statistiques du Bot', 
              value: `**Serveurs:** \`${client.guilds.cache.size}\`\n**Utilisateurs:** \`${client.users.cache.size}\`\n**Uptime:** \`${Math.floor(client.uptime / 1000 / 60)}min\``, 
              inline: true 
            },
            { 
              name: '🔧 Support & Aide', 
              value: '**Besoin d\'aide ?**\nRejoins notre [serveur Discord](https://discord.gg/your-server)\n\n**Commandes populaires:**\n\`/ping\` - Vérifier la latence\n\`/avatar\` - Voir l\'avatar', 
              inline: true 
            },
            {
              name: '🎨 Fonctionnalités',
              value: `**${categories.length}** catégories disponibles\n**${client.commands.size}** commandes totales\n**Interactif** - Menu déroulant`,
              inline: true
            }
          );

          await i.update({ embeds: [newEmbed], components: [row1, row2] });
        }
      }
    });

    collector.on('end', async () => {
      // Désactive les composants après expiration
      const disabledMenu = new StringSelectMenuBuilder()
        .setCustomId('help-menu')
        .setPlaceholder('⏰ Menu expiré')
        .setDisabled(true)
        .addOptions(
          categories.map(cat => ({
            label: `${categoryEmojis[cat] || '📁'} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
            value: cat,
            description: `Voir les commandes ${cat}`
          }))
        );

      const disabledHomeButton = new ButtonBuilder()
        .setCustomId('help-home')
        .setLabel('🏠 Accueil')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true);

      const disabledRefreshButton = new ButtonBuilder()
        .setCustomId('help-refresh')
        .setLabel('🔄 Actualiser')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

      const disabledRow1 = new ActionRowBuilder().addComponents(disabledMenu);
      const disabledRow2 = new ActionRowBuilder().addComponents(disabledHomeButton, disabledRefreshButton);

      try {
        await interaction.editReply({ components: [disabledRow1, disabledRow2] });
      } catch (error) {
        // Ignore les erreurs si le message a été supprimé
      }
    });
  },
};