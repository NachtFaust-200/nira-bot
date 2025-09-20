const { EmbedBuilder } = require('discord.js');
const embedConfig = require('../utils/embedConfig');
const ticketSystem = require('../utils/ticketSystem');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;

    // Vérifier si c'est un salon de ticket
    if (!message.channel.name.startsWith('ticket-')) return;

    try {
      const channelName = message.channel.name;
      let ticket = null;
      
      if (channelName.startsWith('ticket-')) {
        const username = channelName.replace('ticket-', '');
        // Chercher le ticket par nom d'utilisateur
        const tickets = ticketSystem.getGuildTickets(message.guild.id);
        ticket = tickets.find(t => {
          const user = message.guild.members.cache.get(t.userId);
          return user && user.username.toLowerCase().replace(/[^a-z0-9]/g, '') === username;
        });
      }

      if (!ticket) return;

      // Gestion des commandes spéciales dans les tickets
      if (message.content.startsWith('!add ')) {
        const mention = message.mentions.users.first();
        if (!mention) {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Utilisateur non trouvé',
            'Veuillez mentionner un utilisateur à ajouter.',
            'ticket'
          );
          return message.reply({ embeds: [errorEmbed] });
        }

        const result = ticketSystem.addParticipant(message.guild.id, ticketId, mention.id);
        
        if (result.success) {
          const addEmbed = embedConfig.createSuccessEmbed(
            '➕ Participant ajouté',
            `**${mention.username}** a été ajouté au ticket !`,
            'ticket'
          );
          
          // Ping la personne ajoutée
          await message.reply({ content: `${mention} a été ajouté au ticket !` });
          await message.channel.send({ embeds: [addEmbed] });

          // Ajouter les permissions du salon
          await message.channel.permissionOverwrites.create(mention, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
          });
        } else {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Erreur lors de l\'ajout',
            result.error,
            'ticket'
          );
          await message.reply({ embeds: [errorEmbed] });
        }
      }
      else if (message.content.startsWith('!remove ')) {
        const mention = message.mentions.users.first();
        if (!mention) {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Utilisateur non trouvé',
            'Veuillez mentionner un utilisateur à retirer.',
            'ticket'
          );
          return message.reply({ embeds: [errorEmbed] });
        }

        const result = ticketSystem.removeParticipant(message.guild.id, ticketId, mention.id);
        
        if (result.success) {
          const removeEmbed = embedConfig.createSuccessEmbed(
            '➖ Participant retiré',
            `**${mention.username}** a été retiré du ticket !`,
            'ticket'
          );
          
          // Ping la personne retirée
          await message.reply({ content: `${mention} a été retiré du ticket !` });
          await message.channel.send({ embeds: [removeEmbed] });

          // Retirer les permissions du salon
          await message.channel.permissionOverwrites.create(mention, {
            ViewChannel: false
          });
        } else {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Erreur lors de la suppression',
            result.error,
            'ticket'
          );
          await message.reply({ embeds: [errorEmbed] });
        }
      }
      else if (message.content === '!close') {
        const config = ticketSystem.loadConfig();
        const isCreator = ticket.userId === message.author.id;
        const isSupport = config.settings.supportRole && message.member.roles.cache.has(config.settings.supportRole);
        const isAdmin = config.settings.adminRole && message.member.roles.cache.has(config.settings.adminRole);
        const canClose = isCreator || isSupport || isAdmin || message.member.permissions.has('Administrator');

        if (!canClose) {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Permissions insuffisantes',
            'Vous n\'avez pas la permission de fermer ce ticket.',
            'ticket'
          );
          return message.reply({ embeds: [errorEmbed] });
        }

        const result = ticketSystem.closeTicket(message.guild.id, ticketId, message.author.id);
        
        if (result.success) {
          const closeEmbed = embedConfig.createSuccessEmbed(
            '🔒 Ticket fermé',
            `**Ticket #${ticketId}** fermé avec succès !\n\nLe salon sera supprimé dans 10 secondes...`,
            'ticket'
          );
          
          // Ping les support et admins pour la fermeture
          const config = ticketSystem.loadConfig();
          let closePingMessage = `🔒 **Ticket fermé !**\n\n`;
          
          if (config.settings.supportRole) {
            closePingMessage += `<@&${config.settings.supportRole}> `;
          }
          
          if (config.settings.adminRole) {
            closePingMessage += `<@&${config.settings.adminRole}> `;
          }
          
          closePingMessage += `\n**Ticket #${ticketId}** fermé par ${message.author}`;
          
          await message.reply({ content: closePingMessage });
          await message.channel.send({ embeds: [closeEmbed] });

          // Supprimer le salon après 10 secondes
          setTimeout(async () => {
            try {
              await message.channel.delete();
            } catch (error) {
              console.error('Erreur lors de la suppression du salon:', error);
            }
          }, 10000);
        } else {
          const errorEmbed = embedConfig.createErrorEmbed(
            'Erreur lors de la fermeture',
            result.error,
            'ticket'
          );
          await message.reply({ embeds: [errorEmbed] });
        }
      }
      else if (message.content === '!info') {
        const config = ticketSystem.loadConfig();
        const categoryInfo = config.categories[ticket.category];
        const statusEmoji = ticket.status === 'open' ? '🟢' : '🔴';
        const statusText = ticket.status === 'open' ? 'Ouvert' : 'Fermé';

        const infoEmbed = embedConfig.createEmbedWithFooter(
          'ticket',
          `ℹ️ Ticket #${ticketId}`,
          `**Catégorie:** ${categoryInfo.emoji} ${categoryInfo.name}\n**Raison:** ${ticket.reason}\n**Statut:** ${statusEmoji} ${statusText}`,
          message.author
        )
        .addFields(
          {
            name: '📋 Informations',
            value: `**ID:** \`${ticketId}\`\n**Créé par:** <@${ticket.userId}>\n**Créé:** <t:${Math.floor(ticket.createdAt / 1000)}:F>`,
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

        await message.reply({ embeds: [infoEmbed] });
      }
      else if (message.content === '!help') {
        const helpEmbed = embedConfig.createEmbedWithFooter(
          'ticket',
          '❓ Commandes du ticket',
          `**Commandes disponibles dans ce ticket :**\n\n**!add @utilisateur** - Ajouter quelqu'un au ticket\n**!remove @utilisateur** - Retirer quelqu'un du ticket\n**!close** - Fermer le ticket\n**!info** - Voir les informations du ticket\n**!help** - Afficher cette aide`,
          message.author
        );

        await message.reply({ embeds: [helpEmbed] });
      }

    } catch (error) {
      console.error('Erreur dans ticketMessages:', error);
    }
  }
};
