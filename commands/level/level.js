const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embedConfig = require('../../utils/embedConfig');
const levelSystem = require('../../utils/levelSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Affiche votre niveau, XP et progression')
    .addUserOption(option =>
      option.setName('membre')
        .setDescription('Membre dont vous voulez voir le niveau')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('membre') || interaction.user;
    const guildId = interaction.guild.id;
    const userId = targetUser.id;

    try {
      const userData = levelSystem.getUserData(guildId, userId);
      const rank = levelSystem.getUserRank(guildId, userId);
      const requiredXP = levelSystem.calculateRequiredXP(userData.level + 1);
      const currentLevelXP = userData.xp - levelSystem.calculateTotalXPForLevel(userData.level);
      const progress = (currentLevelXP / requiredXP) * 100;

      // Créer la barre de progression
      const progressBar = this.createProgressBar(progress, 20);

      // Calculer les statistiques
      const totalUsers = Object.keys(levelSystem.loadData()).filter(key => key.startsWith(`${guildId}-`)).length;
      const percentile = rank ? Math.round(((totalUsers - rank + 1) / totalUsers) * 100) : 0;

      const embed = embedConfig.createEmbedWithFooter(
        'stats',
        `📊 Niveau de ${targetUser.username}`,
        `**Niveau ${userData.level}** • **${userData.xp.toLocaleString()} XP**\n\n${progressBar}\n\n**Progression:** ${currentLevelXP.toLocaleString()}/${requiredXP.toLocaleString()} XP (${progress.toFixed(1)}%)`,
        interaction.user
      )
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        {
          name: '🏆 Classement',
          value: `**Position:** #${rank || 'N/A'}\n**Percentile:** ${percentile}%\n**Sur ${totalUsers} membres**`,
          inline: true
        },
        {
          name: '📈 Statistiques',
          value: `**Messages:** ${userData.totalMessages.toLocaleString()}\n**Temps vocal:** ${Math.floor(userData.totalVoiceTime)}min\n**Réactions:** ${userData.totalReactions.toLocaleString()}`,
          inline: true
        },
        {
          name: '⚡ Activité',
          value: `**Commandes:** ${userData.totalCommands.toLocaleString()}\n**Dernière activité:** <t:${Math.floor(userData.lastActivity / 1000)}:R>\n**Notifications:** ${userData.levelUpNotifications ? 'Activées' : 'Désactivées'}`,
          inline: true
        }
      );

      // Ajouter les récompenses si disponibles
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

      // Boutons d'action
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`level-refresh-${userId}`)
            .setLabel('🔄 Actualiser')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`level-leaderboard-${guildId}`)
            .setLabel('🏆 Classement')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`level-toggle-notifications-${userId}`)
            .setLabel(userData.levelUpNotifications ? '🔕 Désactiver notifs' : '🔔 Activer notifs')
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

        if (i.customId.startsWith('level-refresh-')) {
          // Actualiser les données
          const refreshedUserData = levelSystem.getUserData(guildId, userId);
          const refreshedRank = levelSystem.getUserRank(guildId, userId);
          const refreshedRequiredXP = levelSystem.calculateRequiredXP(refreshedUserData.level + 1);
          const refreshedCurrentLevelXP = refreshedUserData.xp - levelSystem.calculateTotalXPForLevel(refreshedUserData.level);
          const refreshedProgress = (refreshedCurrentLevelXP / refreshedRequiredXP) * 100;
          const refreshedProgressBar = this.createProgressBar(refreshedProgress, 20);

          const refreshedEmbed = embedConfig.createEmbedWithFooter(
            'stats',
            `📊 Niveau de ${targetUser.username} (Actualisé)`,
            `**Niveau ${refreshedUserData.level}** • **${refreshedUserData.xp.toLocaleString()} XP**\n\n${refreshedProgressBar}\n\n**Progression:** ${refreshedCurrentLevelXP.toLocaleString()}/${refreshedRequiredXP.toLocaleString()} XP (${refreshedProgress.toFixed(1)}%)`,
            interaction.user
          )
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
          .addFields(
            {
              name: '🏆 Classement',
              value: `**Position:** #${refreshedRank || 'N/A'}\n**Percentile:** ${Math.round(((totalUsers - refreshedRank + 1) / totalUsers) * 100)}%\n**Sur ${totalUsers} membres**`,
              inline: true
            },
            {
              name: '📈 Statistiques',
              value: `**Messages:** ${refreshedUserData.totalMessages.toLocaleString()}\n**Temps vocal:** ${Math.floor(refreshedUserData.totalVoiceTime)}min\n**Réactions:** ${refreshedUserData.totalReactions.toLocaleString()}`,
              inline: true
            },
            {
              name: '⚡ Activité',
              value: `**Commandes:** ${refreshedUserData.totalCommands.toLocaleString()}\n**Dernière activité:** <t:${Math.floor(refreshedUserData.lastActivity / 1000)}:R>\n**Notifications:** ${refreshedUserData.levelUpNotifications ? 'Activées' : 'Désactivées'}`,
              inline: true
            }
          );

          await i.update({ embeds: [refreshedEmbed], components: [row] });
        }

        if (i.customId.startsWith('level-leaderboard-')) {
          // Rediriger vers le classement
          const leaderboardCommand = client.commands.get('leaderboard');
          if (leaderboardCommand) {
            await leaderboardCommand.execute(interaction, client);
          }
        }

        if (i.customId.startsWith('level-toggle-notifications-')) {
          // Basculer les notifications
          const userData = levelSystem.getUserData(guildId, userId);
          userData.levelUpNotifications = !userData.levelUpNotifications;
          
          const data = levelSystem.loadData();
          data[`${guildId}-${userId}`] = userData;
          levelSystem.saveData(data);

          await i.reply({ 
            content: `🔔 Notifications de niveau ${userData.levelUpNotifications ? 'activées' : 'désactivées'} !`, 
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
                .setLabel('🏆 Classement')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('disabled')
                .setLabel('🔔 Notifications')
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
        'Erreur lors de la récupération du niveau',
        `Impossible de récupérer les informations de niveau.\n\n**Erreur:** \`${error.message}\``,
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
  }
};
