const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const embedConfig = require('../../utils/embedConfig');
const ticketSystem = require('../../utils/ticketSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-config')
    .setDescription('Configuration du système de tickets (Admin seulement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('Voir la configuration actuelle')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Activer/Désactiver le système de tickets')
        .addBooleanOption(option =>
          option.setName('etat')
            .setDescription('État du système')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('settings')
        .setDescription('Modifier les paramètres généraux')
        .addIntegerOption(option =>
          option.setName('max-tickets')
            .setDescription('Nombre maximum de tickets par utilisateur')
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option.setName('auto-close')
            .setDescription('Fermeture automatique après X jours')
            .setMinValue(1)
            .setMaxValue(30)
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option.setName('require-reason')
            .setDescription('Exiger une raison pour créer un ticket')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option.setName('allow-user-close')
            .setDescription('Permettre aux utilisateurs de fermer leurs tickets')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('roles')
        .setDescription('Configurer les rôles')
        .addRoleOption(option =>
          option.setName('support')
            .setDescription('Rôle de support')
            .setRequired(false)
        )
        .addRoleOption(option =>
          option.setName('admin')
            .setDescription('Rôle d\'administrateur')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('channel')
        .setDescription('Configurer les salons')
        .addChannelOption(option =>
          option.setName('log')
            .setDescription('Salon de logs des tickets')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('category')
        .setDescription('Gérer les catégories de tickets')
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Action à effectuer')
            .setRequired(true)
            .addChoices(
              { name: '➕ Ajouter', value: 'add' },
              { name: '✏️ Modifier', value: 'edit' },
              { name: '🗑️ Supprimer', value: 'remove' },
              { name: '📋 Lister', value: 'list' }
            )
        )
        .addStringOption(option =>
          option.setName('id')
            .setDescription('ID de la catégorie')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('nom')
            .setDescription('Nom de la catégorie')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Description de la catégorie')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('emoji')
            .setDescription('Emoji de la catégorie')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('Voir les statistiques des tickets')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('cleanup')
        .setDescription('Nettoyer les anciens tickets')
    ),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    try {
      await interaction.deferReply({ ephemeral: true });

      if (subcommand === 'view') {
        const config = ticketSystem.loadConfig();
        const stats = ticketSystem.getStats(interaction.guild.id);

        const embed = embedConfig.createEmbedWithFooter(
          'ticket',
          '⚙️ Configuration du système de tickets',
          `**État:** ${config.enabled ? '🟢 Activé' : '🔴 Désactivé'}\n\n**Configuration actuelle du système de tickets**`,
          interaction.user
        )
        .addFields(
          {
            name: '📊 Paramètres généraux',
            value: `**Max tickets/utilisateur:** ${config.settings.maxTicketsPerUser}\n**Fermeture auto:** ${config.settings.autoCloseAfterDays} jours\n**Raison requise:** ${config.settings.requireReason ? 'Oui' : 'Non'}\n**Fermeture utilisateur:** ${config.settings.allowUserClose ? 'Oui' : 'Non'}`,
            inline: true
          },
          {
            name: '👥 Rôles',
            value: `**Support:** ${config.settings.supportRole ? `<@&${config.settings.supportRole}>` : 'Non configuré'}\n**Admin:** ${config.settings.adminRole ? `<@&${config.settings.adminRole}>` : 'Non configuré'}`,
            inline: true
          },
          {
            name: '📋 Salons',
            value: `**Logs:** ${config.settings.logChannel ? `<#${config.settings.logChannel}>` : 'Non configuré'}`,
            inline: true
          },
          {
            name: '🏷️ Catégories',
            value: Object.entries(config.categories).map(([id, cat]) => 
              `${cat.emoji} **${cat.name}** (\`${id}\`)`
            ).join('\n') || 'Aucune catégorie',
            inline: false
          },
          {
            name: '📈 Statistiques',
            value: `**Total:** ${stats.total}\n**Ouverts:** ${stats.open}\n**Fermés:** ${stats.closed}`,
            inline: true
          }
        );

        await interaction.editReply({ embeds: [embed] });

      } else if (subcommand === 'toggle') {
        const etat = interaction.options.getBoolean('etat');
        const config = ticketSystem.loadConfig();
        
        config.enabled = etat;
        ticketSystem.saveConfig(config);

        const embed = embedConfig.createSuccessEmbed(
          'Configuration mise à jour',
          `**Système de tickets ${etat ? 'activé' : 'désactivé'}** avec succès !`,
          'ticket'
        );

        await interaction.editReply({ embeds: [embed] });

      } else if (subcommand === 'settings') {
        const maxTickets = interaction.options.getInteger('max-tickets');
        const autoClose = interaction.options.getInteger('auto-close');
        const requireReason = interaction.options.getBoolean('require-reason');
        const allowUserClose = interaction.options.getBoolean('allow-user-close');

        const config = ticketSystem.loadConfig();
        let updated = false;

        if (maxTickets !== null) {
          config.settings.maxTicketsPerUser = maxTickets;
          updated = true;
        }
        if (autoClose !== null) {
          config.settings.autoCloseAfterDays = autoClose;
          updated = true;
        }
        if (requireReason !== null) {
          config.settings.requireReason = requireReason;
          updated = true;
        }
        if (allowUserClose !== null) {
          config.settings.allowUserClose = allowUserClose;
          updated = true;
        }

        if (updated) {
          ticketSystem.saveConfig(config);
          const embed = embedConfig.createSuccessEmbed(
            'Paramètres mis à jour',
            `**Configuration des tickets mise à jour !**\n\n**Max tickets/utilisateur:** ${config.settings.maxTicketsPerUser}\n**Fermeture auto:** ${config.settings.autoCloseAfterDays} jours\n**Raison requise:** ${config.settings.requireReason ? 'Oui' : 'Non'}\n**Fermeture utilisateur:** ${config.settings.allowUserClose ? 'Oui' : 'Non'}`,
            'ticket'
          );
          await interaction.editReply({ embeds: [embed] });
        } else {
          const embed = embedConfig.createWarningEmbed(
            'Aucune modification',
            'Aucun paramètre n\'a été modifié.',
            'ticket'
          );
          await interaction.editReply({ embeds: [embed] });
        }

      } else if (subcommand === 'roles') {
        const supportRole = interaction.options.getRole('support');
        const adminRole = interaction.options.getRole('admin');

        const config = ticketSystem.loadConfig();
        let updated = false;

        if (supportRole) {
          config.settings.supportRole = supportRole.id;
          updated = true;
        }
        if (adminRole) {
          config.settings.adminRole = adminRole.id;
          updated = true;
        }

        if (updated) {
          ticketSystem.saveConfig(config);
          const embed = embedConfig.createSuccessEmbed(
            'Rôles mis à jour',
            `**Rôles de tickets mis à jour !**\n\n**Support:** ${supportRole ? supportRole : 'Non modifié'}\n**Admin:** ${adminRole ? adminRole : 'Non modifié'}`,
            'ticket'
          );
          await interaction.editReply({ embeds: [embed] });
        } else {
          const embed = embedConfig.createWarningEmbed(
            'Aucune modification',
            'Aucun rôle n\'a été modifié.',
            'ticket'
          );
          await interaction.editReply({ embeds: [embed] });
        }

      } else if (subcommand === 'channel') {
        const logChannel = interaction.options.getChannel('log');

        const config = ticketSystem.loadConfig();
        config.settings.logChannel = logChannel ? logChannel.id : null;
        ticketSystem.saveConfig(config);

        const embed = embedConfig.createSuccessEmbed(
          'Salon mis à jour',
          `**Salon de logs:** ${logChannel ? logChannel : 'Désactivé'}`,
          'ticket'
        );

        await interaction.editReply({ embeds: [embed] });

      } else if (subcommand === 'category') {
        const action = interaction.options.getString('action');
        const id = interaction.options.getString('id');
        const nom = interaction.options.getString('nom');
        const description = interaction.options.getString('description');
        const emoji = interaction.options.getString('emoji');

        const config = ticketSystem.loadConfig();

        if (action === 'add') {
          if (!id || !nom || !description || !emoji) {
            const errorEmbed = embedConfig.createErrorEmbed(
              'Paramètres manquants',
              'Tous les paramètres sont requis pour ajouter une catégorie.',
              'ticket'
            );
            return interaction.editReply({ embeds: [errorEmbed] });
          }

          if (config.categories[id]) {
            const errorEmbed = embedConfig.createErrorEmbed(
              'Catégorie existante',
              'Une catégorie avec cet ID existe déjà.',
              'ticket'
            );
            return interaction.editReply({ embeds: [errorEmbed] });
          }

          config.categories[id] = {
            name: nom,
            description: description,
            emoji: emoji,
            color: '#0099FF'
          };

          ticketSystem.saveConfig(config);

          const embed = embedConfig.createSuccessEmbed(
            'Catégorie ajoutée',
            `**Catégorie "${nom}" ajoutée avec succès !**\n\n**ID:** \`${id}\`\n**Nom:** ${nom}\n**Description:** ${description}\n**Emoji:** ${emoji}`,
            'ticket'
          );

          await interaction.editReply({ embeds: [embed] });

        } else if (action === 'edit') {
          if (!id || !config.categories[id]) {
            const errorEmbed = embedConfig.createErrorEmbed(
              'Catégorie non trouvée',
              'Impossible de trouver la catégorie spécifiée.',
              'ticket'
            );
            return interaction.editReply({ embeds: [errorEmbed] });
          }

          if (nom) config.categories[id].name = nom;
          if (description) config.categories[id].description = description;
          if (emoji) config.categories[id].emoji = emoji;

          ticketSystem.saveConfig(config);

          const embed = embedConfig.createSuccessEmbed(
            'Catégorie modifiée',
            `**Catégorie "${config.categories[id].name}" modifiée avec succès !**`,
            'ticket'
          );

          await interaction.editReply({ embeds: [embed] });

        } else if (action === 'remove') {
          if (!id || !config.categories[id]) {
            const errorEmbed = embedConfig.createErrorEmbed(
              'Catégorie non trouvée',
              'Impossible de trouver la catégorie spécifiée.',
              'ticket'
            );
            return interaction.editReply({ embeds: [errorEmbed] });
          }

          const categoryName = config.categories[id].name;
          delete config.categories[id];
          ticketSystem.saveConfig(config);

          const embed = embedConfig.createSuccessEmbed(
            'Catégorie supprimée',
            `**Catégorie "${categoryName}" supprimée avec succès !**`,
            'ticket'
          );

          await interaction.editReply({ embeds: [embed] });

        } else if (action === 'list') {
          const categoriesList = Object.entries(config.categories).map(([id, cat]) => 
            `**${cat.emoji} ${cat.name}** (\`${id}\`)\n*${cat.description}*`
          ).join('\n\n') || 'Aucune catégorie';

          const embed = embedConfig.createEmbedWithFooter(
            'ticket',
            '🏷️ Catégories de tickets',
            categoriesList,
            interaction.user
          );

          await interaction.editReply({ embeds: [embed] });
        }

      } else if (subcommand === 'stats') {
        const stats = ticketSystem.getStats(interaction.guild.id);
        const tickets = ticketSystem.getGuildTickets(interaction.guild.id);

        // Calculer les statistiques avancées
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTickets = tickets.filter(ticket => 
          new Date(ticket.createdAt) >= today
        ).length;

        const thisWeek = new Date();
        thisWeek.setDate(thisWeek.getDate() - 7);
        const weekTickets = tickets.filter(ticket => 
          new Date(ticket.createdAt) >= thisWeek
        ).length;

        const embed = embedConfig.createEmbedWithFooter(
          'ticket',
          '📊 Statistiques des tickets',
          `**Statistiques complètes du système de tickets**`,
          interaction.user
        )
        .addFields(
          {
            name: '📈 Général',
            value: `**Total:** ${stats.total}\n**Ouverts:** ${stats.open}\n**Fermés:** ${stats.closed}`,
            inline: true
          },
          {
            name: '⏰ Récent',
            value: `**Aujourd'hui:** ${todayTickets}\n**Cette semaine:** ${weekTickets}`,
            inline: true
          },
          {
            name: '🏷️ Par catégorie',
            value: Object.entries(stats.byCategory).map(([cat, count]) => 
              `**${cat}:** ${count}`
            ).join('\n') || 'Aucune donnée',
            inline: true
          }
        );

        await interaction.editReply({ embeds: [embed] });

      } else if (subcommand === 'cleanup') {
        const deleted = ticketSystem.cleanupOldTickets(interaction.guild.id);

        const embed = embedConfig.createSuccessEmbed(
          'Nettoyage terminé',
          `**${deleted}** anciens tickets fermés automatiquement.`,
          'ticket'
        );

        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      const errorEmbed = embedConfig.createErrorEmbed(
        'Erreur lors de la configuration',
        `Impossible de modifier la configuration.\n\n**Erreur:** \`${error.message}\``,
        'ticket'
      );

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
};
