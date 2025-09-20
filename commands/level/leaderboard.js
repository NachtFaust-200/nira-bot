const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embedConfig = require('../../utils/embedConfig');
const levelSystem = require('../../utils/levelSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Affiche le classement des niveaux du serveur')
    .addIntegerOption(option =>
      option.setName('limite')
        .setDescription('Nombre de membres à afficher (max 25)')
        .setMinValue(5)
        .setMaxValue(25)
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type de classement')
        .setRequired(false)
        .addChoices(
          { name: '📊 XP Total', value: 'xp' },
          { name: '💬 Messages', value: 'messages' },
          { name: '🎤 Temps vocal', value: 'voice' },
          { name: '👍 Réactions', value: 'reactions' },
          { name: '⚡ Commandes', value: 'commands' }
        )
    ),

  async execute(interaction, client) {
    const limit = interaction.options.getInteger('limite') || 10;
    const type = interaction.options.getString('type') || 'xp';

    try {
      const leaderboard = levelSystem.getLeaderboard(interaction.guild.id, limit);
      
      if (leaderboard.length === 0) {
        const emptyEmbed = embedConfig.createEmbedWithFooter(
          'stats',
          '🏆 Classement vide',
          'Aucun membre n\'a encore gagné d\'XP sur ce serveur.\n\n**Commencez à parler pour gagner de l\'XP !**',
          interaction.user
        );

        return interaction.reply({ embeds: [emptyEmbed] });
      }

      // Trier selon le type
      const sortedLeaderboard = this.sortLeaderboard(leaderboard, type);
      
      // Créer la liste du classement
      const leaderboardText = await this.createLeaderboardText(sortedLeaderboard, interaction.guild, type);

      // Statistiques du serveur
      const totalUsers = Object.keys(levelSystem.loadData()).filter(key => key.startsWith(`${interaction.guild.id}-`)).length;
      const totalXP = leaderboard.reduce((sum, user) => sum + user.xp, 0);
      const averageLevel = leaderboard.reduce((sum, user) => sum + user.level, 0) / leaderboard.length;

      const embed = embedConfig.createEmbedWithFooter(
        'stats',
        `🏆 Classement - ${this.getTypeName(type)}`,
        leaderboardText,
        interaction.user
      )
      .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }))
      .addFields(
        {
          name: '📊 Statistiques du serveur',
          value: `**Membres actifs:** ${totalUsers}\n**XP total:** ${totalXP.toLocaleString()}\n**Niveau moyen:** ${averageLevel.toFixed(1)}`,
          inline: true
        },
        {
          name: '🎯 Top 3',
          value: sortedLeaderboard.slice(0, 3).map((user, index) => {
            const member = interaction.guild.members.cache.get(user.userId);
            const medal = ['🥇', '🥈', '🥉'][index];
            return `${medal} **${member?.displayName || 'Utilisateur inconnu'}** - Niveau ${user.level}`;
          }).join('\n'),
          inline: true
        }
      );

      // Boutons de navigation
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`leaderboard-refresh-${type}`)
            .setLabel('🔄 Actualiser')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('leaderboard-xp')
            .setLabel('📊 XP')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('leaderboard-messages')
            .setLabel('💬 Messages')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('leaderboard-voice')
            .setLabel('🎤 Vocal')
            .setStyle(ButtonStyle.Secondary)
        );

      await interaction.reply({ embeds: [embed], components: [row] });

      // Collecteur pour les boutons
      const collector = interaction.channel.createMessageComponentCollector({
        time: 300000 // 5 minutes
      });

      collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: '❌ Ce menu n\'est pas pour toi.', ephemeral: true });
        }

        if (i.customId.startsWith('leaderboard-')) {
          const newType = i.customId.replace('leaderboard-', '');
          
          if (newType === 'refresh') {
            // Actualiser le classement
            const refreshedLeaderboard = levelSystem.getLeaderboard(interaction.guild.id, limit);
            const refreshedSortedLeaderboard = this.sortLeaderboard(refreshedLeaderboard, type);
            const refreshedLeaderboardText = await this.createLeaderboardText(refreshedSortedLeaderboard, interaction.guild, type);

            const refreshedEmbed = embedConfig.createEmbedWithFooter(
              'stats',
              `🏆 Classement - ${this.getTypeName(type)} (Actualisé)`,
              refreshedLeaderboardText,
              interaction.user
            )
            .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }))
            .addFields(
              {
                name: '📊 Statistiques du serveur',
                value: `**Membres actifs:** ${totalUsers}\n**XP total:** ${totalXP.toLocaleString()}\n**Niveau moyen:** ${averageLevel.toFixed(1)}`,
                inline: true
              },
              {
                name: '🎯 Top 3',
                value: refreshedSortedLeaderboard.slice(0, 3).map((user, index) => {
                  const member = interaction.guild.members.cache.get(user.userId);
                  const medal = ['🥇', '🥈', '🥉'][index];
                  return `${medal} **${member?.displayName || 'Utilisateur inconnu'}** - Niveau ${user.level}`;
                }).join('\n'),
                inline: true
              }
            );

            await i.update({ embeds: [refreshedEmbed], components: [row] });
          } else if (['xp', 'messages', 'voice', 'reactions', 'commands'].includes(newType)) {
            // Changer le type de classement
            const newLeaderboard = levelSystem.getLeaderboard(interaction.guild.id, limit);
            const newSortedLeaderboard = this.sortLeaderboard(newLeaderboard, newType);
            const newLeaderboardText = await this.createLeaderboardText(newSortedLeaderboard, interaction.guild, newType);

            const newEmbed = embedConfig.createEmbedWithFooter(
              'stats',
              `🏆 Classement - ${this.getTypeName(newType)}`,
              newLeaderboardText,
              interaction.user
            )
            .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }))
            .addFields(
              {
                name: '📊 Statistiques du serveur',
                value: `**Membres actifs:** ${totalUsers}\n**XP total:** ${totalXP.toLocaleString()}\n**Niveau moyen:** ${averageLevel.toFixed(1)}`,
                inline: true
              },
              {
                name: '🎯 Top 3',
                value: newSortedLeaderboard.slice(0, 3).map((user, index) => {
                  const member = interaction.guild.members.cache.get(user.userId);
                  const medal = ['🥇', '🥈', '🥉'][index];
                  return `${medal} **${member?.displayName || 'Utilisateur inconnu'}** - Niveau ${user.level}`;
                }).join('\n'),
                inline: true
              }
            );

            // Mettre à jour les boutons
            const newRow = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(`leaderboard-refresh-${newType}`)
                  .setLabel('🔄 Actualiser')
                  .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                  .setCustomId('leaderboard-xp')
                  .setLabel('📊 XP')
                  .setStyle(newType === 'xp' ? ButtonStyle.Success : ButtonStyle.Primary),
                new ButtonBuilder()
                  .setCustomId('leaderboard-messages')
                  .setLabel('💬 Messages')
                  .setStyle(newType === 'messages' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                  .setCustomId('leaderboard-voice')
                  .setLabel('🎤 Vocal')
                  .setStyle(newType === 'voice' ? ButtonStyle.Success : ButtonStyle.Secondary)
              );

            await i.update({ embeds: [newEmbed], components: [newRow] });
          }
        }
      });

      collector.on('end', async () => {
        try {
          const disabledRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('disabled')
                .setLabel('🔄 Actualiser')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('disabled')
                .setLabel('📊 XP')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('disabled')
                .setLabel('💬 Messages')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('disabled')
                .setLabel('🎤 Vocal')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            );

          await interaction.editReply({ components: [disabledRow] });
        } catch (error) {
          // Ignore les erreurs si le message a été supprimé
        }
      });

    } catch (error) {
      const errorEmbed = embedConfig.createErrorEmbed(
        'Erreur lors de la récupération du classement',
        `Impossible de récupérer le classement.\n\n**Erreur:** \`${error.message}\``,
        'stats'
      );

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },

  // Trier le classement selon le type
  sortLeaderboard(leaderboard, type) {
    return leaderboard.sort((a, b) => {
      switch (type) {
        case 'xp':
          return b.xp - a.xp;
        case 'messages':
          return b.totalMessages - a.totalMessages;
        case 'voice':
          return b.totalVoiceTime - a.totalVoiceTime;
        case 'reactions':
          return b.totalReactions - a.totalReactions;
        case 'commands':
          return b.totalCommands - a.totalCommands;
        default:
          return b.xp - a.xp;
      }
    });
  },

  // Créer le texte du classement
  async createLeaderboardText(leaderboard, guild, type) {
    const lines = [];
    
    for (let i = 0; i < leaderboard.length; i++) {
      const user = leaderboard[i];
      const member = guild.members.cache.get(user.userId);
      const displayName = member?.displayName || 'Utilisateur inconnu';
      
      // Emojis de position
      let positionEmoji = '';
      if (i === 0) positionEmoji = '🥇';
      else if (i === 1) positionEmoji = '🥈';
      else if (i === 2) positionEmoji = '🥉';
      else positionEmoji = `${i + 1}.`;

      // Valeur selon le type
      let value = '';
      switch (type) {
        case 'xp':
          value = `**${user.xp.toLocaleString()} XP** • Niveau ${user.level}`;
          break;
        case 'messages':
          value = `**${user.totalMessages.toLocaleString()} messages**`;
          break;
        case 'voice':
          value = `**${Math.floor(user.totalVoiceTime)} minutes**`;
          break;
        case 'reactions':
          value = `**${user.totalReactions.toLocaleString()} réactions**`;
          break;
        case 'commands':
          value = `**${user.totalCommands.toLocaleString()} commandes**`;
          break;
        default:
          value = `**${user.xp.toLocaleString()} XP** • Niveau ${user.level}`;
      }

      lines.push(`${positionEmoji} **${displayName}**\n${value}`);
    }

    return lines.join('\n\n');
  },

  // Obtenir le nom du type
  getTypeName(type) {
    const names = {
      'xp': 'XP Total',
      'messages': 'Messages',
      'voice': 'Temps vocal',
      'reactions': 'Réactions',
      'commands': 'Commandes'
    };
    return names[type] || 'XP Total';
  }
};
