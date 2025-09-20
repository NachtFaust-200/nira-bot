const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embedConfig = require('../../utils/embedConfig');
const levelSystem = require('../../utils/levelSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Affiche le profil détaillé d\'un membre avec ses statistiques')
    .addUserOption(option =>
      option.setName('membre')
        .setDescription('Membre dont vous voulez voir le profil')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('membre') || interaction.user;
    const guildId = interaction.guild.id;
    const userId = targetUser.id;

    try {
      const userData = levelSystem.getUserData(guildId, userId);
      const rank = levelSystem.getUserRank(guildId, userId);
      const leaderboard = levelSystem.getLeaderboard(guildId, 1000);
      const totalUsers = leaderboard.length;

      // Calculer les statistiques avancées
      const percentile = rank ? Math.round(((totalUsers - rank + 1) / totalUsers) * 100) : 0;
      const requiredXP = levelSystem.calculateRequiredXP(userData.level + 1);
      const currentLevelXP = userData.xp - levelSystem.calculateTotalXPForLevel(userData.level);
      const progress = (currentLevelXP / requiredXP) * 100;

      // Créer la barre de progression
      const progressBar = this.createProgressBar(progress, 25);

      // Calculer les moyennes
      const averageXPPerMessage = userData.totalMessages > 0 ? Math.round(userData.xp / userData.totalMessages) : 0;
      const averageMessagesPerDay = this.calculateAveragePerDay(userData.totalMessages, userData.lastActivity);
      const averageVoicePerDay = this.calculateAveragePerDay(userData.totalVoiceTime, userData.lastActivity);

      // Déterminer le titre selon le niveau
      const title = this.getUserTitle(userData.level);
      const badge = this.getUserBadge(userData.level);

      const embed = embedConfig.createEmbedWithFooter(
        'stats',
        `${badge} Profil de ${targetUser.username} - ${title}`,
        `**Niveau ${userData.level}** • **${userData.xp.toLocaleString()} XP**\n\n${progressBar}\n\n**Progression:** ${currentLevelXP.toLocaleString()}/${requiredXP.toLocaleString()} XP (${progress.toFixed(1)}%)`,
        interaction.user
      )
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        {
          name: '🏆 Classement & Position',
          value: `**Position:** #${rank || 'N/A'}\n**Percentile:** ${percentile}%\n**Sur ${totalUsers} membres**\n**Titre:** ${title}`,
          inline: true
        },
        {
          name: '📊 Statistiques Globales',
          value: `**Messages:** ${userData.totalMessages.toLocaleString()}\n**Temps vocal:** ${Math.floor(userData.totalVoiceTime)}min\n**Réactions:** ${userData.totalReactions.toLocaleString()}\n**Commandes:** ${userData.totalCommands.toLocaleString()}`,
          inline: true
        },
        {
          name: '⚡ Moyennes & Performance',
          value: `**XP/message:** ${averageXPPerMessage}\n**Messages/jour:** ${averageMessagesPerDay.toFixed(1)}\n**Vocal/jour:** ${averageVoicePerDay.toFixed(1)}min\n**Dernière activité:** <t:${Math.floor(userData.lastActivity / 1000)}:R>`,
          inline: true
        }
      );

      // Ajouter les récompenses
      const rewards = levelSystem.checkRewards(guildId, userId, userData.level);
      if (rewards.length > 0) {
        const rewardsText = rewards.map(reward => 
          `🎁 **Niveau ${reward.level}:** ${reward.name}`
        ).join('\n');
        
        embed.addFields({
          name: '🎁 Récompenses débloquées',
          value: rewardsText,
          inline: false
        });
      }

      // Ajouter les prochaines récompenses
      const nextRewards = this.getNextRewards(userData.level);
      if (nextRewards.length > 0) {
        const nextRewardsText = nextRewards.map(reward => 
          `🎯 **Niveau ${reward.level}:** ${reward.name} (${reward.xpNeeded} XP restants)`
        ).join('\n');
        
        embed.addFields({
          name: '🎯 Prochaines récompenses',
          value: nextRewardsText,
          inline: false
        });
      }

      // Ajouter les statistiques de progression
      const weeklyStats = this.calculateWeeklyStats(userData);
      if (weeklyStats) {
        embed.addFields({
          name: '📈 Progression cette semaine',
          value: `**Messages:** +${weeklyStats.messages}\n**Vocal:** +${weeklyStats.voice}min\n**Réactions:** +${weeklyStats.reactions}\n**Commandes:** +${weeklyStats.commands}`,
          inline: true
        });
      }

      // Boutons d'action
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`rank-refresh-${userId}`)
            .setLabel('🔄 Actualiser')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`rank-compare-${userId}`)
            .setLabel('⚔️ Comparer')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`rank-achievements-${userId}`)
            .setLabel('🏆 Succès')
            .setStyle(ButtonStyle.Success)
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

        if (i.customId.startsWith('rank-refresh-')) {
          // Actualiser le profil
          const refreshedUserData = levelSystem.getUserData(guildId, userId);
          const refreshedRank = levelSystem.getUserRank(guildId, userId);
          const refreshedRequiredXP = levelSystem.calculateRequiredXP(refreshedUserData.level + 1);
          const refreshedCurrentLevelXP = refreshedUserData.xp - levelSystem.calculateTotalXPForLevel(refreshedUserData.level);
          const refreshedProgress = (refreshedCurrentLevelXP / refreshedRequiredXP) * 100;
          const refreshedProgressBar = this.createProgressBar(refreshedProgress, 25);

          const refreshedEmbed = embedConfig.createEmbedWithFooter(
            'stats',
            `${badge} Profil de ${targetUser.username} - ${title} (Actualisé)`,
            `**Niveau ${refreshedUserData.level}** • **${refreshedUserData.xp.toLocaleString()} XP**\n\n${refreshedProgressBar}\n\n**Progression:** ${refreshedCurrentLevelXP.toLocaleString()}/${refreshedRequiredXP.toLocaleString()} XP (${refreshedProgress.toFixed(1)}%)`,
            interaction.user
          )
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
          .addFields(
            {
              name: '🏆 Classement & Position',
              value: `**Position:** #${refreshedRank || 'N/A'}\n**Percentile:** ${Math.round(((totalUsers - refreshedRank + 1) / totalUsers) * 100)}%\n**Sur ${totalUsers} membres**\n**Titre:** ${title}`,
              inline: true
            },
            {
              name: '📊 Statistiques Globales',
              value: `**Messages:** ${refreshedUserData.totalMessages.toLocaleString()}\n**Temps vocal:** ${Math.floor(refreshedUserData.totalVoiceTime)}min\n**Réactions:** ${refreshedUserData.totalReactions.toLocaleString()}\n**Commandes:** ${refreshedUserData.totalCommands.toLocaleString()}`,
              inline: true
            },
            {
              name: '⚡ Moyennes & Performance',
              value: `**XP/message:** ${Math.round(refreshedUserData.xp / Math.max(refreshedUserData.totalMessages, 1))}\n**Messages/jour:** ${this.calculateAveragePerDay(refreshedUserData.totalMessages, refreshedUserData.lastActivity).toFixed(1)}\n**Vocal/jour:** ${this.calculateAveragePerDay(refreshedUserData.totalVoiceTime, refreshedUserData.lastActivity).toFixed(1)}min\n**Dernière activité:** <t:${Math.floor(refreshedUserData.lastActivity / 1000)}:R>`,
              inline: true
            }
          );

          await i.update({ embeds: [refreshedEmbed], components: [row] });
        }

        if (i.customId.startsWith('rank-compare-')) {
          // Fonctionnalité de comparaison (à implémenter)
          await i.reply({ 
            content: '🔧 Fonctionnalité de comparaison en cours de développement !', 
            ephemeral: true 
          });
        }

        if (i.customId.startsWith('rank-achievements-')) {
          // Fonctionnalité de succès (à implémenter)
          await i.reply({ 
            content: '🔧 Fonctionnalité de succès en cours de développement !', 
            ephemeral: true 
          });
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
                .setLabel('⚔️ Comparer')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('disabled')
                .setLabel('🏆 Succès')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true)
            );

          await interaction.editReply({ components: [disabledRow] });
        } catch (error) {
          // Ignore les erreurs si le message a été supprimé
        }
      });

    } catch (error) {
      const errorEmbed = embedConfig.createErrorEmbed(
        'Erreur lors de la récupération du profil',
        `Impossible de récupérer le profil du membre.\n\n**Erreur:** \`${error.message}\``,
        'stats'
      );

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },

  // Créer une barre de progression
  createProgressBar(progress, length) {
    const filled = Math.round((progress / 100) * length);
    const empty = length - filled;
    
    const filledChar = '█';
    const emptyChar = '░';
    
    return `\`${filledChar.repeat(filled)}${emptyChar.repeat(empty)}\` ${progress.toFixed(1)}%`;
  },

  // Calculer la moyenne par jour
  calculateAveragePerDay(total, lastActivity) {
    const daysSinceLastActivity = (Date.now() - lastActivity) / (1000 * 60 * 60 * 24);
    return total / Math.max(daysSinceLastActivity, 1);
  },

  // Obtenir le titre selon le niveau
  getUserTitle(level) {
    if (level >= 500) return 'Divin';
    if (level >= 200) return 'Mythique';
    if (level >= 100) return 'Légende';
    if (level >= 50) return 'Vétéran';
    if (level >= 25) return 'Régulier';
    if (level >= 10) return 'Actif';
    if (level >= 5) return 'Nouveau';
    return 'Débutant';
  },

  // Obtenir le badge selon le niveau
  getUserBadge(level) {
    if (level >= 500) return '👑';
    if (level >= 200) return '💎';
    if (level >= 100) return '🏆';
    if (level >= 50) return '🥇';
    if (level >= 25) return '🥈';
    if (level >= 10) return '🥉';
    if (level >= 5) return '⭐';
    return '🌱';
  },

  // Obtenir les prochaines récompenses
  getNextRewards(currentLevel) {
    const config = levelSystem.loadConfig();
    if (!config || !config.rewards) return [];

    const nextRewards = [];
    for (const [level, reward] of Object.entries(config.rewards)) {
      const rewardLevel = parseInt(level);
      if (rewardLevel > currentLevel) {
        const xpNeeded = levelSystem.calculateTotalXPForLevel(rewardLevel) - levelSystem.calculateTotalXPForLevel(currentLevel);
        nextRewards.push({
          level: rewardLevel,
          name: reward.name,
          xpNeeded
        });
      }
    }

    return nextRewards.slice(0, 3); // Limiter à 3 prochaines récompenses
  },

  // Calculer les statistiques de la semaine
  calculateWeeklyStats(userData) {
    // Cette fonction pourrait être étendue pour calculer les stats de la semaine
    // Pour l'instant, on retourne null
    return null;
  }
};
