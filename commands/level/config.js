const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const embedConfig = require('../../utils/embedConfig');
const levelSystem = require('../../utils/levelSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level-config')
    .setDescription('Configuration du système de niveaux (Admin seulement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('Voir la configuration actuelle')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Réinitialiser les données de niveaux')
        .addStringOption(option =>
          option.setName('scope')
            .setDescription('Portée de la réinitialisation')
            .setRequired(true)
            .addChoices(
              { name: '👤 Utilisateur', value: 'user' },
              { name: '🏠 Serveur', value: 'guild' }
            )
        )
        .addUserOption(option =>
          option.setName('membre')
            .setDescription('Membre à réinitialiser (si scope = user)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('xp')
        .setDescription('Modifier les réglages XP')
        .addIntegerOption(option =>
          option.setName('min')
            .setDescription('XP minimum par message')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option.setName('max')
            .setDescription('XP maximum par message')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option.setName('voice')
            .setDescription('XP par minute de vocal')
            .setMinValue(1)
            .setMaxValue(50)
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option.setName('reaction')
            .setDescription('XP par réaction')
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option.setName('command')
            .setDescription('XP par commande')
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('cooldown')
        .setDescription('Modifier le cooldown XP')
        .addIntegerOption(option =>
          option.setName('seconds')
            .setDescription('Cooldown en secondes')
            .setMinValue(10)
            .setMaxValue(300)
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('multiplier')
        .setDescription('Modifier le multiplicateur de niveau')
        .addNumberOption(option =>
          option.setName('value')
            .setDescription('Multiplicateur (1.0 - 2.0)')
            .setMinValue(1.0)
            .setMaxValue(2.0)
            .setRequired(true)
        )
    ),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    try {
      await interaction.deferReply({ ephemeral: true });

      if (subcommand === 'view') {
        const config = levelSystem.loadConfig();
        const stats = levelSystem.getGlobalStats();
        const guildStats = levelSystem.getLeaderboard(interaction.guild.id, 1000);

        const embed = embedConfig.createEmbedWithFooter(
          'stats',
          '⚙️ Configuration du système de niveaux',
          `**Configuration actuelle du système de niveaux**`,
          interaction.user
        )
        .addFields(
          {
            name: '📊 Réglages XP',
            value: `**Messages:** ${config.xpPerMessage.min}-${config.xpPerMessage.max} XP\n**Vocal:** ${config.xpPerVoiceMinute} XP/min\n**Réactions:** ${config.xpPerReaction} XP\n**Commandes:** ${config.xpPerCommand} XP`,
            inline: true
          },
          {
            name: '⏰ Cooldown & Niveaux',
            value: `**Cooldown:** ${config.cooldown / 1000}s\n**Multiplicateur:** ${config.levelUpMultiplier}x\n**Niveau max:** ${config.maxLevel}`,
            inline: true
          },
          {
            name: '🏆 Récompenses',
            value: Object.entries(config.rewards).map(([level, reward]) => 
              `**Niveau ${level}:** ${reward.name}`
            ).join('\n') || 'Aucune récompense configurée',
            inline: false
          },
          {
            name: '📈 Statistiques globales',
            value: `**Utilisateurs:** ${stats.totalUsers}\n**XP total:** ${stats.totalXP.toLocaleString()}\n**Niveau moyen:** ${stats.averageLevel.toFixed(1)}\n**Niveau max:** ${stats.topLevel}`,
            inline: true
          },
          {
            name: '🏠 Statistiques du serveur',
            value: `**Membres actifs:** ${guildStats.length}\n**XP total:** ${guildStats.reduce((sum, user) => sum + user.xp, 0).toLocaleString()}\n**Niveau moyen:** ${(guildStats.reduce((sum, user) => sum + user.level, 0) / Math.max(guildStats.length, 1)).toFixed(1)}`,
            inline: true
          }
        );

        await interaction.editReply({ embeds: [embed] });

      } else if (subcommand === 'reset') {
        const scope = interaction.options.getString('scope');
        const member = interaction.options.getUser('membre');

        if (scope === 'user' && !member) {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Membre requis',
            'Vous devez spécifier un membre pour réinitialiser ses données.',
            'stats'
          );
          return interaction.editReply({ embeds: [errorEmbed] });
        }

        let deleted = 0;
        if (scope === 'user') {
          const success = levelSystem.resetUser(interaction.guild.id, member.id);
          if (success) {
            deleted = 1;
          }
        } else if (scope === 'guild') {
          deleted = levelSystem.resetGuild(interaction.guild.id);
        }

        const embed = embedConfig.createSuccessEmbed(
          'Données réinitialisées',
          `**${deleted}** utilisateur(s) réinitialisé(s) avec succès.`,
          'stats'
        );

        await interaction.editReply({ embeds: [embed] });

      } else if (subcommand === 'xp') {
        const min = interaction.options.getInteger('min');
        const max = interaction.options.getInteger('max');
        const voice = interaction.options.getInteger('voice');
        const reaction = interaction.options.getInteger('reaction');
        const command = interaction.options.getInteger('command');

        const config = levelSystem.loadConfig();
        let updated = false;

        if (min !== null) {
          config.xpPerMessage.min = min;
          updated = true;
        }
        if (max !== null) {
          config.xpPerMessage.max = max;
          updated = true;
        }
        if (voice !== null) {
          config.xpPerVoiceMinute = voice;
          updated = true;
        }
        if (reaction !== null) {
          config.xpPerReaction = reaction;
          updated = true;
        }
        if (command !== null) {
          config.xpPerCommand = command;
          updated = true;
        }

        if (updated) {
          levelSystem.saveConfig(config);
          const embed = embedConfig.createSuccessEmbed(
            'Configuration mise à jour',
            `**Réglages XP modifiés avec succès !**\n\n**Messages:** ${config.xpPerMessage.min}-${config.xpPerMessage.max} XP\n**Vocal:** ${config.xpPerVoiceMinute} XP/min\n**Réactions:** ${config.xpPerReaction} XP\n**Commandes:** ${config.xpPerCommand} XP`,
            'stats'
          );
          await interaction.editReply({ embeds: [embed] });
        } else {
          const embed = embedConfig.createWarningEmbed(
            'Aucune modification',
            'Aucun paramètre XP n\'a été modifié.',
            'stats'
          );
          await interaction.editReply({ embeds: [embed] });
        }

      } else if (subcommand === 'cooldown') {
        const seconds = interaction.options.getInteger('seconds');
        const config = levelSystem.loadConfig();
        
        config.cooldown = seconds * 1000;
        levelSystem.saveConfig(config);

        const embed = embedConfig.createSuccessEmbed(
          'Cooldown mis à jour',
          `**Cooldown XP modifié à ${seconds} secondes !**`,
          'stats'
        );

        await interaction.editReply({ embeds: [embed] });

      } else if (subcommand === 'multiplier') {
        const value = interaction.options.getNumber('value');
        const config = levelSystem.loadConfig();
        
        config.levelUpMultiplier = value;
        levelSystem.saveConfig(config);

        const embed = embedConfig.createSuccessEmbed(
          'Multiplicateur mis à jour',
          `**Multiplicateur de niveau modifié à ${value}x !**`,
          'stats'
        );

        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      const errorEmbed = embedConfig.createErrorEmbed(
        'Erreur lors de la configuration',
        `Impossible de modifier la configuration.\n\n**Erreur:** \`${error.message}\``,
        'stats'
      );

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
};
