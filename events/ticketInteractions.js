const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const embedConfig = require('../utils/embedConfig');
const ticketSystem = require('../utils/ticketSystem');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isButton()) return;

    try {
      // Gestion des boutons de création de tickets
      if (interaction.customId.startsWith('ticket-create-')) {
        const category = interaction.customId.replace('ticket-create-', '');
        const config = ticketSystem.loadConfig();

        if (!config.enabled) {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Système désactivé',
            'Le système de tickets est actuellement désactivé.',
            'ticket'
          );
          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Vérifier si la catégorie existe
        if (!config.categories[category]) {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Catégorie invalide',
            'Cette catégorie de ticket n\'existe pas.',
            'ticket'
          );
          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Vérifier le nombre maximum de tickets
        const userTickets = ticketSystem.getUserTickets(interaction.guild.id, interaction.user.id);
        if (userTickets.length >= config.settings.maxTicketsPerUser) {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Limite atteinte',
            `Vous avez déjà ${config.settings.maxTicketsPerUser} tickets ouverts. Fermez-en un avant d'en créer un nouveau.`,
            'ticket'
          );
          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Créer le ticket
        const result = ticketSystem.createTicket(
          interaction.guild.id, 
          interaction.user.id, 
          category, 
          'Ticket créé via le panneau'
        );

        if (!result.success) {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Erreur lors de la création',
            result.error,
            'ticket'
          );
          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const ticket = result.ticket;
        const categoryInfo = config.categories[category];

        // Créer le salon de ticket avec nom d'utilisateur
        const username = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
        const channelName = `ticket-${username}`;
        const channel = await interaction.guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: null,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.ViewChannel]
            },
            {
              id: interaction.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
            }
          ]
        });

        // Ajouter les rôles de support
        if (config.settings.supportRole) {
          await channel.permissionOverwrites.create(config.settings.supportRole, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
          });
        }

        if (config.settings.adminRole) {
          await channel.permissionOverwrites.create(config.settings.adminRole, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            ManageMessages: true
          });
        }

        // Embed de confirmation
        const successEmbed = embedConfig.createSuccessEmbed(
          '🎫 Ticket créé !',
          `**Votre ticket a été créé avec succès !**\n\n**Salon:** ${channel}\n**Catégorie:** ${categoryInfo.emoji} ${categoryInfo.name}`,
          'ticket'
        );

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        // Embed dans le salon de ticket
        const ticketEmbed = embedConfig.createEmbedWithFooter(
          'ticket',
          `${categoryInfo.emoji} Ticket #${ticket.id} - ${categoryInfo.name}`,
          `**Bienvenue dans votre ticket !**\n\n**Raison:** ${ticket.reason}\n\n**Merci de décrire votre problème en détail. L'équipe de support vous répondra bientôt !**`,
          interaction.user
        )
        .addFields(
          {
            name: '📋 Informations du ticket',
            value: `**ID:** \`${ticket.id}\`\n**Catégorie:** ${categoryInfo.name}\n**Statut:** 🟢 Ouvert\n**Créé:** <t:${Math.floor(ticket.createdAt / 1000)}:R>`,
            inline: true
          },
          {
            name: '👥 Participants',
            value: `**Créateur:** ${interaction.user}\n**Support:** ${config.settings.supportRole ? `<@&${config.settings.supportRole}>` : 'Non configuré'}`,
            inline: true
          }
        );

        // Créer le message de ping pour les support et admins
        let pingMessage = `🎫 **Nouveau ticket créé !**\n\n`;
        
        if (config.settings.supportRole) {
          pingMessage += `<@&${config.settings.supportRole}> `;
        }
        
        if (config.settings.adminRole) {
          pingMessage += `<@&${config.settings.adminRole}> `;
        }
        
        pingMessage += `\n**Ticket #${ticket.id}** - ${categoryInfo.emoji} ${categoryInfo.name}\n**Créé par:** ${interaction.user}\n**Raison:** ${ticket.reason}`;

        // Boutons de gestion du ticket
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`ticket-close-${ticket.id}`)
              .setLabel('🔒 Fermer')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId(`ticket-add-${ticket.id}`)
              .setLabel('➕ Ajouter')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(`ticket-remove-${ticket.id}`)
              .setLabel('➖ Retirer')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(`ticket-info-${ticket.id}`)
              .setLabel('ℹ️ Infos')
              .setStyle(ButtonStyle.Primary)
          );

        // Envoyer le message de ping et l'embed
        await channel.send({ content: pingMessage });
        await channel.send({ embeds: [ticketEmbed], components: [row] });

        // Log dans le salon de logs si configuré (sans ping)
        if (config.settings.logChannel) {
          const logChannel = interaction.guild.channels.cache.get(config.settings.logChannel);
          if (logChannel) {
            const logEmbed = embedConfig.createEmbedWithFooter(
              'ticket',
              '🎫 Nouveau ticket créé',
              `**Ticket #${ticket.id}** créé par ${interaction.user}`,
              interaction.user
            )
            .addFields(
              {
                name: '📋 Détails',
                value: `**Catégorie:** ${categoryInfo.name}\n**Salon:** ${channel}\n**Raison:** ${ticket.reason}`,
                inline: true
              }
            );

            await logChannel.send({ embeds: [logEmbed] });
          }
        }

      }
      // Gestion des boutons de fermeture de tickets
      else if (interaction.customId.startsWith('ticket-close-')) {
        const ticketId = interaction.customId.replace('ticket-close-', '');
        const ticket = ticketSystem.getTicket(interaction.guild.id, ticketId);

        if (!ticket) {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Ticket non trouvé',
            'Impossible de trouver ce ticket.',
            'ticket'
          );
          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        if (ticket.status === 'closed') {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Ticket déjà fermé',
            'Ce ticket est déjà fermé.',
            'ticket'
          );
          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Vérifier les permissions
        const config = ticketSystem.loadConfig();
        const isCreator = ticket.userId === interaction.user.id;
        const isSupport = config.settings.supportRole && interaction.member.roles.cache.has(config.settings.supportRole);
        const isAdmin = config.settings.adminRole && interaction.member.roles.cache.has(config.settings.adminRole);
        const canClose = isCreator || isSupport || isAdmin || interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!canClose) {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Permissions insuffisantes',
            'Vous n\'avez pas la permission de fermer ce ticket.',
            'ticket'
          );
          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const result = ticketSystem.closeTicket(interaction.guild.id, ticket.id, interaction.user.id);
        
        if (!result.success) {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Erreur lors de la fermeture',
            result.error,
            'ticket'
          );
          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const closeEmbed = embedConfig.createSuccessEmbed(
          '🔒 Ticket fermé',
          `**Ticket #${ticket.id}** fermé avec succès !`,
          'ticket'
        )
        .addFields(
          {
            name: '📋 Informations',
            value: `**Fermé par:** ${interaction.user}\n**Heure:** <t:${Math.floor(Date.now() / 1000)}:F>\n**Durée:** <t:${Math.floor(ticket.createdAt / 1000)}:R>`,
            inline: true
          }
        );

        // Boutons pour fermer ou supprimer le ticket
        const closeRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`ticket-delete-${ticket.id}`)
              .setLabel('🗑️ Supprimer le ticket')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId(`ticket-reopen-${ticket.id}`)
              .setLabel('🔄 Rouvrir')
              .setStyle(ButtonStyle.Secondary)
          );

        await interaction.reply({ embeds: [closeEmbed], components: [closeRow] });

      }
      // Gestion des boutons d'ajout de participants
      else if (interaction.customId.startsWith('ticket-add-')) {
        const ticketId = interaction.customId.replace('ticket-add-', '');
        
        const addEmbed = embedConfig.createEmbedWithFooter(
          'ticket',
          '➕ Ajouter un participant',
          '**Mentionnez la personne que vous voulez ajouter au ticket.**\n\nExemple: `@utilisateur`',
          interaction.user
        );

        await interaction.reply({ embeds: [addEmbed], ephemeral: true });

      }
      // Gestion des boutons de suppression de participants
      else if (interaction.customId.startsWith('ticket-remove-')) {
        const ticketId = interaction.customId.replace('ticket-remove-', '');
        
        const removeEmbed = embedConfig.createEmbedWithFooter(
          'ticket',
          '➖ Retirer un participant',
          '**Mentionnez la personne que vous voulez retirer du ticket.**\n\nExemple: `@utilisateur`',
          interaction.user
        );

        await interaction.reply({ embeds: [removeEmbed], ephemeral: true });

      }
      // Gestion des boutons d'informations
      else if (interaction.customId.startsWith('ticket-info-')) {
        const ticketId = interaction.customId.replace('ticket-info-', '');
        const ticket = ticketSystem.getTicket(interaction.guild.id, ticketId);

        if (!ticket) {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Ticket non trouvé',
            'Impossible de trouver ce ticket.',
            'ticket'
          );
          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const config = ticketSystem.loadConfig();
        const categoryInfo = config.categories[ticket.category];
        const statusEmoji = ticket.status === 'open' ? '🟢' : '🔴';
        const statusText = ticket.status === 'open' ? 'Ouvert' : 'Fermé';

        const infoEmbed = embedConfig.createEmbedWithFooter(
          'ticket',
          `ℹ️ Ticket #${ticket.id}`,
          `**Catégorie:** ${categoryInfo.emoji} ${categoryInfo.name}\n**Raison:** ${ticket.reason}\n**Statut:** ${statusEmoji} ${statusText}`,
          interaction.user
        )
        .addFields(
          {
            name: '📋 Informations',
            value: `**ID:** \`${ticket.id}\`\n**Créé par:** <@${ticket.userId}>\n**Créé:** <t:${Math.floor(ticket.createdAt / 1000)}:F>`,
            inline: true
          },
          {
            name: '👥 Participants',
            value: ticket.participants.map(id => `<@${id}>`).join('\n') || 'Aucun',
            inline: true
          },
          {
            name: '⏰ Détails',
            value: `**Fermé:** ${ticket.closedAt ? `<t:${Math.floor(ticket.closedAt / 1000)}:F>` : 'Non fermé'}\n**Fermé par:** ${ticket.closedBy ? `<@${ticket.closedBy}>` : 'N/A'}`,
            inline: true
          }
        );

        await interaction.reply({ embeds: [infoEmbed], ephemeral: true });

      }
      // Gestion de la confirmation de réinitialisation
      else if (interaction.customId === 'ticket-reset-confirm') {
        // Supprimer tous les tickets
        const data = ticketSystem.loadData();
        if (data[interaction.guild.id]) {
          delete data[interaction.guild.id];
          ticketSystem.saveData(data);
        }

        // Réinitialiser la configuration
        const defaultConfig = {
          enabled: false,
          categories: {
            'support': {
              name: 'Support',
              description: 'Aide générale et support',
              emoji: '🎧',
              color: '#00FF00'
            },
            'bug': {
              name: 'Bug Report',
              description: 'Signaler un bug',
              emoji: '🐛',
              color: '#FF0000'
            },
            'suggestion': {
              name: 'Suggestion',
              description: 'Proposer une amélioration',
              emoji: '💡',
              color: '#FFA500'
            },
            'other': {
              name: 'Autre',
              description: 'Autre demande',
              emoji: '📝',
              color: '#0099FF'
            }
          },
          settings: {
            maxTicketsPerUser: 3,
            autoCloseAfterDays: 7,
            requireReason: true,
            allowUserClose: true,
            logChannel: null,
            supportRole: null,
            adminRole: null
          }
        };
        ticketSystem.saveConfig(defaultConfig);

        const resetEmbed = embedConfig.createSuccessEmbed(
          '🔄 Système réinitialisé',
          '**Le système de tickets a été complètement réinitialisé !**\n\nTous les tickets ont été supprimés et la configuration a été remise à zéro.',
          'ticket'
        );

        await interaction.update({ embeds: [resetEmbed], components: [] });

      }
      // Gestion de la suppression de ticket
      else if (interaction.customId.startsWith('ticket-delete-')) {
        const ticketId = interaction.customId.replace('ticket-delete-', '');
        const ticket = ticketSystem.getTicket(interaction.guild.id, ticketId);

        if (!ticket) {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Ticket non trouvé',
            'Impossible de trouver ce ticket.',
            'ticket'
          );
          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Vérifier les permissions
        const config = ticketSystem.loadConfig();
        const isCreator = ticket.userId === interaction.user.id;
        const isSupport = config.settings.supportRole && interaction.member.roles.cache.has(config.settings.supportRole);
        const isAdmin = config.settings.adminRole && interaction.member.roles.cache.has(config.settings.adminRole);
        const canDelete = isCreator || isSupport || isAdmin || interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!canDelete) {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Permissions insuffisantes',
            'Vous n\'avez pas la permission de supprimer ce ticket.',
            'ticket'
          );
          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Supprimer le ticket de la base de données
        const deleteResult = ticketSystem.deleteTicket(interaction.guild.id, ticket.id);
        
        if (!deleteResult.success) {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Erreur lors de la suppression',
            deleteResult.error,
            'ticket'
          );
          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const deleteEmbed = embedConfig.createSuccessEmbed(
          '🗑️ Ticket supprimé',
          `**Ticket #${ticket.id}** supprimé avec succès !`,
          'ticket'
        );

        await interaction.reply({ embeds: [deleteEmbed] });

        // Supprimer le salon après 3 secondes
        setTimeout(async () => {
          try {
            await interaction.channel.delete();
          } catch (error) {
            console.error('Erreur lors de la suppression du salon:', error);
          }
        }, 3000);

      }
      // Gestion de la réouverture de ticket
      else if (interaction.customId.startsWith('ticket-reopen-')) {
        const ticketId = interaction.customId.replace('ticket-reopen-', '');
        const ticket = ticketSystem.getTicket(interaction.guild.id, ticketId);

        if (!ticket) {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Ticket non trouvé',
            'Impossible de trouver ce ticket.',
            'ticket'
          );
          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        if (ticket.status === 'open') {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Ticket déjà ouvert',
            'Ce ticket est déjà ouvert.',
            'ticket'
          );
          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const result = ticketSystem.reopenTicket(interaction.guild.id, ticket.id, interaction.user.id);
        
        if (!result.success) {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Erreur lors de la réouverture',
            result.error,
            'ticket'
          );
          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const reopenEmbed = embedConfig.createSuccessEmbed(
          '🔄 Ticket rouvert',
          `**Ticket #${ticket.id}** rouvert avec succès !`,
          'ticket'
        );

        // Ping les support et admins pour la réouverture
        const config = ticketSystem.loadConfig();
        let reopenPingMessage = `🔄 **Ticket rouvert !**\n\n`;
        
        if (config.settings.supportRole) {
          reopenPingMessage += `<@&${config.settings.supportRole}> `;
        }
        
        if (config.settings.adminRole) {
          reopenPingMessage += `<@&${config.settings.adminRole}> `;
        }
        
        reopenPingMessage += `\n**Ticket #${ticket.id}** rouvert par ${interaction.user}`;

        await interaction.reply({ content: reopenPingMessage });
        await interaction.followUp({ embeds: [reopenEmbed] });

      }
      // Gestion de l'annulation de réinitialisation
      else if (interaction.customId === 'ticket-reset-cancel') {
        const cancelEmbed = embedConfig.createEmbedWithFooter(
          'ticket',
          '❌ Réinitialisation annulée',
          'La réinitialisation du système de tickets a été annulée.',
          interaction.user
        );

        await interaction.update({ embeds: [cancelEmbed], components: [] });
      }

    } catch (error) {
      console.error('Erreur dans ticketInteractions:', error);
      
      const errorEmbed = embedConfig.createErrorEmbed(
        'Erreur lors de l\'interaction',
        `Une erreur est survenue.\n\n**Erreur:** \`${error.message}\``,
        'ticket'
      );

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  }
};
