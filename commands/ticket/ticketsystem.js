const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const embedConfig = require('../../utils/embedConfig');
const ticketSystem = require('../../utils/ticketSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketsystem')
    .setDescription('Système de tickets automatique - Setup complet (Admin seulement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Configurer le système de tickets automatiquement')
        .addChannelOption(option =>
          option.setName('salon')
            .setDescription('Salon où créer le panneau de tickets')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('support')
            .setDescription('Rôle de support (optionnel)')
            .setRequired(false)
        )
        .addRoleOption(option =>
          option.setName('admin')
            .setDescription('Rôle d\'administrateur (optionnel)')
            .setRequired(false)
        )
        .addChannelOption(option =>
          option.setName('logs')
            .setDescription('Salon de logs (optionnel)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('panel')
        .setDescription('Créer un nouveau panneau de tickets')
        .addChannelOption(option =>
          option.setName('salon')
            .setDescription('Salon où créer le panneau')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Réinitialiser complètement le système de tickets')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Voir le statut du système de tickets')
    ),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    try {
      await interaction.deferReply({ ephemeral: true });

      if (subcommand === 'setup') {
        const channel = interaction.options.getChannel('salon');
        const supportRole = interaction.options.getRole('support');
        const adminRole = interaction.options.getRole('admin');
        const logChannel = interaction.options.getChannel('logs');

        // Vérifier que le salon est un salon texte
        if (channel.type !== ChannelType.GuildText) {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Type de salon invalide',
            'Le salon doit être un salon texte.',
            'ticket'
          );
          return interaction.editReply({ embeds: [errorEmbed] });
        }

        // Configuration automatique du système
        const config = ticketSystem.loadConfig();
        
        // Activer le système
        config.enabled = true;
        
        // Configurer les rôles
        if (supportRole) config.settings.supportRole = supportRole.id;
        if (adminRole) config.settings.adminRole = adminRole.id;
        if (logChannel) config.settings.logChannel = logChannel.id;

        // Paramètres optimaux
        config.settings.maxTicketsPerUser = 3;
        config.settings.autoCloseAfterDays = 7;
        config.settings.requireReason = true;
        config.settings.allowUserClose = true;

        // Sauvegarder la configuration
        ticketSystem.saveConfig(config);

        // Créer le panneau de tickets
        const panelEmbed = embedConfig.createEmbedWithFooter(
          'ticket',
          '🎫 Système de tickets',
          `**Bienvenue dans le système de tickets !**\n\nChoisissez une catégorie pour créer un ticket et obtenir de l'aide.\n\n**Comment ça marche ?**\n• Cliquez sur un bouton ci-dessous\n• Un salon privé sera créé\n• L'équipe de support vous aidera\n• Fermez le ticket quand c'est résolu`,
          interaction.user
        )
        .addFields(
          {
            name: '🎧 Support',
            value: 'Aide générale et support',
            inline: true
          },
          {
            name: '🐛 Bug Report',
            value: 'Signaler un problème',
            inline: true
          },
          {
            name: '💡 Suggestion',
            value: 'Proposer une amélioration',
            inline: true
          },
          {
            name: '📝 Autre',
            value: 'Autre demande',
            inline: true
          }
        );

        // Boutons pour créer des tickets
        const row1 = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('ticket-create-support')
              .setLabel('🎧 Support')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('ticket-create-bug')
              .setLabel('🐛 Bug Report')
              .setStyle(ButtonStyle.Danger)
          );

        const row2 = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('ticket-create-suggestion')
              .setLabel('💡 Suggestion')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('ticket-create-other')
              .setLabel('📝 Autre')
              .setStyle(ButtonStyle.Secondary)
          );

        // Envoyer le panneau
        await channel.send({ 
          embeds: [panelEmbed], 
          components: [row1, row2] 
        });

        // Embed de confirmation
        const successEmbed = embedConfig.createSuccessEmbed(
          '🎫 Système de tickets configuré !',
          `**Configuration automatique terminée !**\n\n**Salon du panneau:** ${channel}\n**Rôle support:** ${supportRole || 'Non configuré'}\n**Rôle admin:** ${adminRole || 'Non configuré'}\n**Salon de logs:** ${logChannel || 'Non configuré'}\n\n**Le panneau de tickets a été créé dans ${channel} !**`,
          'ticket'
        )
        .addFields(
          {
            name: '⚙️ Configuration',
            value: `**Max tickets/utilisateur:** 3\n**Fermeture auto:** 7 jours\n**Raison requise:** Oui\n**Fermeture utilisateur:** Oui`,
            inline: true
          },
          {
            name: '🏷️ Catégories disponibles',
            value: '🎧 Support\n🐛 Bug Report\n💡 Suggestion\n📝 Autre',
            inline: true
          }
        );

        await interaction.editReply({ embeds: [successEmbed] });

      } else if (subcommand === 'panel') {
        const channel = interaction.options.getChannel('salon');

        if (channel.type !== ChannelType.GuildText) {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Type de salon invalide',
            'Le salon doit être un salon texte.',
            'ticket'
          );
          return interaction.editReply({ embeds: [errorEmbed] });
        }

        // Vérifier si le système est activé
        const config = ticketSystem.loadConfig();
        if (!config.enabled) {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Système désactivé',
            'Le système de tickets n\'est pas activé. Utilisez `/ticketsystem setup` d\'abord.',
            'ticket'
          );
          return interaction.editReply({ embeds: [errorEmbed] });
        }

        // Créer le panneau
        const panelEmbed = embedConfig.createEmbedWithFooter(
          'ticket',
          '🎫 Système de tickets',
          `**Bienvenue dans le système de tickets !**\n\nChoisissez une catégorie pour créer un ticket et obtenir de l'aide.\n\n**Comment ça marche ?**\n• Cliquez sur un bouton ci-dessous\n• Un salon privé sera créé\n• L'équipe de support vous aidera\n• Fermez le ticket quand c'est résolu`,
          interaction.user
        )
        .addFields(
          {
            name: '🎧 Support',
            value: 'Aide générale et support',
            inline: true
          },
          {
            name: '🐛 Bug Report',
            value: 'Signaler un problème',
            inline: true
          },
          {
            name: '💡 Suggestion',
            value: 'Proposer une amélioration',
            inline: true
          },
          {
            name: '📝 Autre',
            value: 'Autre demande',
            inline: true
          }
        );

        const row1 = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('ticket-create-support')
              .setLabel('🎧 Support')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('ticket-create-bug')
              .setLabel('🐛 Bug Report')
              .setStyle(ButtonStyle.Danger)
          );

        const row2 = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('ticket-create-suggestion')
              .setLabel('💡 Suggestion')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('ticket-create-other')
              .setLabel('📝 Autre')
              .setStyle(ButtonStyle.Secondary)
          );

        await channel.send({ 
          embeds: [panelEmbed], 
          components: [row1, row2] 
        });

        const successEmbed = embedConfig.createSuccessEmbed(
          'Panneau créé !',
          `**Panneau de tickets créé dans ${channel} !**`,
          'ticket'
        );

        await interaction.editReply({ embeds: [successEmbed] });

      } else if (subcommand === 'reset') {
        // Confirmation pour la réinitialisation
        const confirmEmbed = embedConfig.createWarningEmbed(
          '⚠️ Confirmation requise',
          '**Êtes-vous sûr de vouloir réinitialiser le système de tickets ?**\n\nCette action va :\n• Supprimer tous les tickets existants\n• Réinitialiser la configuration\n• Désactiver le système\n\n**Cette action est irréversible !**',
          'ticket'
        );

        const confirmRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('ticket-reset-confirm')
              .setLabel('✅ Confirmer')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId('ticket-reset-cancel')
              .setLabel('❌ Annuler')
              .setStyle(ButtonStyle.Secondary)
          );

        await interaction.editReply({ 
          embeds: [confirmEmbed], 
          components: [confirmRow] 
        });

      } else if (subcommand === 'status') {
        const config = ticketSystem.loadConfig();
        const stats = ticketSystem.getStats(interaction.guild.id);

        const statusEmbed = embedConfig.createEmbedWithFooter(
          'ticket',
          '📊 Statut du système de tickets',
          `**État du système de tickets**`,
          interaction.user
        )
        .addFields(
          {
            name: '⚙️ Configuration',
            value: `**Activé:** ${config.enabled ? '🟢 Oui' : '🔴 Non'}\n**Max tickets/utilisateur:** ${config.settings.maxTicketsPerUser}\n**Fermeture auto:** ${config.settings.autoCloseAfterDays} jours`,
            inline: true
          },
          {
            name: '👥 Rôles',
            value: `**Support:** ${config.settings.supportRole ? `<@&${config.settings.supportRole}>` : '❌ Non configuré'}\n**Admin:** ${config.settings.adminRole ? `<@&${config.settings.adminRole}>` : '❌ Non configuré'}`,
            inline: true
          },
          {
            name: '📋 Salons',
            value: `**Logs:** ${config.settings.logChannel ? `<#${config.settings.logChannel}>` : '❌ Non configuré'}`,
            inline: true
          },
          {
            name: '📈 Statistiques',
            value: `**Total tickets:** ${stats.total}\n**Ouverts:** ${stats.open}\n**Fermés:** ${stats.closed}`,
            inline: true
          },
          {
            name: '🏷️ Catégories',
            value: Object.keys(config.categories).length + ' catégories configurées',
            inline: true
          }
        );

        await interaction.editReply({ embeds: [statusEmbed] });
      }

    } catch (error) {
      const errorEmbed = embedConfig.createErrorEmbed(
        'Erreur lors de la configuration',
        `Impossible de configurer le système de tickets.\n\n**Erreur:** \`${error.message}\``,
        'ticket'
      );

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
};
