// Configuration des embeds pour un style uniforme et professionnel
const { EmbedBuilder } = require('discord.js');

class EmbedConfig {
  constructor() {
    // Couleurs principales du bot
    this.colors = {
      primary: '#00FFFF',      // Cyan principal
      success: '#00FF00',      // Vert succès
      warning: '#FFA500',      // Orange avertissement
      error: '#FF0000',        // Rouge erreur
      info: '#0099FF',         // Bleu information
      anime: '#FF69B4',        // Rose anime
      fun: '#FFD700',          // Or fun
      moderation: '#8B0000',   // Rouge foncé modération
      member: '#32CD32',       // Vert lime membre
      stats: '#9370DB',        // Violet stats
      music: '#FF1493',        // Rose vif musique
      voice: '#00BFFF'         // Bleu ciel vocal
    };

    // Emojis pour les catégories
    this.categoryEmojis = {
      bot: '🤖',
      anime: '🎌',
      fun: '🎉',
      member: '👤',
      moderation: '🛡️',
      stats: '📊',
      music: '🎵',
      voice: '🎧',
      tempvoc: '🎧'
    };

    // Images TBATE par catégorie (gérées dynamiquement)
    this.useTBATEImages = false; // Désactivé - aucune image
  }

  // Créer un embed de base avec le style du bot
  createBaseEmbed(category = 'bot', title = '', description = '') {
    const embed = new EmbedBuilder()
      .setColor(this.colors[category] || this.colors.primary)
      .setTimestamp();

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    
    // Aucune image - système désactivé

    return embed;
  }

  // Créer un embed de succès
  createSuccessEmbed(title, description, category = 'bot') {
    return this.createBaseEmbed(category, `✅ ${title}`, description)
      .setColor(this.colors.success);
  }

  // Créer un embed d'erreur
  createErrorEmbed(title, description, category = 'bot') {
    return this.createBaseEmbed(category, `❌ ${title}`, description)
      .setColor(this.colors.error);
  }

  // Créer un embed d'avertissement
  createWarningEmbed(title, description, category = 'bot') {
    return this.createBaseEmbed(category, `⚠️ ${title}`, description)
      .setColor(this.colors.warning);
  }

  // Créer un embed d'information
  createInfoEmbed(title, description, category = 'bot') {
    return this.createBaseEmbed(category, `ℹ️ ${title}`, description)
      .setColor(this.colors.info);
  }

  // Créer un embed avec footer personnalisé
  createEmbedWithFooter(category, title, description, user, customFooter = null) {
    const embed = this.createBaseEmbed(category, title, description);
    
    if (customFooter) {
      embed.setFooter({ text: customFooter, iconURL: user.displayAvatarURL() });
    } else {
      embed.setFooter({ 
        text: `Demandé par ${user.username}`, 
        iconURL: user.displayAvatarURL() 
      });
    }

    return embed;
  }

  // Créer un embed de commande avec toutes les infos
  createCommandEmbed(category, commandName, description, user, additionalFields = []) {
    const embed = this.createEmbedWithFooter(
      category,
      `${this.categoryEmojis[category] || '📁'} Commande ${commandName}`,
      description,
      user
    );

    if (additionalFields.length > 0) {
      embed.addFields(additionalFields);
    }

    return embed;
  }

  // Créer un embed de statistiques
  createStatsEmbed(title, stats, user, category = 'stats') {
    const embed = this.createEmbedWithFooter(category, `📊 ${title}`, '', user);
    
    // Ajouter les statistiques sous forme de champs
    Object.entries(stats).forEach(([key, value], index) => {
      embed.addFields({
        name: key,
        value: value,
        inline: index % 3 !== 2 // 3 colonnes
      });
    });

    return embed;
  }

  // Créer un embed de liste
  createListEmbed(category, title, items, user, itemPrefix = '•') {
    const embed = this.createEmbedWithFooter(category, title, '', user);
    
    const listText = items.map((item, index) => 
      `${itemPrefix} ${item}`
    ).join('\n');

    embed.setDescription(listText);
    return embed;
  }

  // Créer un embed de jeu
  createGameEmbed(gameName, gameState, user, category = 'fun') {
    const embed = this.createEmbedWithFooter(
      category,
      `🎮 ${gameName}`,
      gameState.description || '',
      user
    );

    if (gameState.fields) {
      embed.addFields(gameState.fields);
    }

    if (gameState.image) {
      embed.setImage(gameState.image);
    }

    return embed;
  }

  // Créer un embed de modération
  createModerationEmbed(action, target, moderator, reason, category = 'moderation') {
    const embed = this.createEmbedWithFooter(
      category,
      `🛡️ ${action}`,
      `**Cible:** ${target}\n**Modérateur:** ${moderator}\n**Raison:** ${reason}`,
      moderator
    );

    embed.addFields(
      { name: '⏰ Heure', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
      { name: '🆔 ID Cible', value: `\`${target.id || target}\``, inline: true }
    );

    return embed;
  }

  // Créer un embed de ticket
  createTicketEmbed(category, title, description, user, ticketInfo = {}) {
    const embed = this.createEmbedWithFooter(category, title, description, user);
    
    if (ticketInfo.id) {
      embed.addFields(
        { name: '🎫 ID Ticket', value: `\`${ticketInfo.id}\``, inline: true },
        { name: '📋 Statut', value: ticketInfo.status || 'Ouvert', inline: true },
        { name: '👥 Participants', value: ticketInfo.participants || '1', inline: true }
      );
    }

    return embed;
  }

  // Créer un embed de niveau
  createLevelEmbed(category, title, description, user, levelInfo = {}) {
    const embed = this.createEmbedWithFooter(category, title, description, user);
    
    if (levelInfo.level) {
      embed.addFields(
        { name: '⭐ Niveau', value: `${levelInfo.level}`, inline: true },
        { name: '📊 XP', value: `${levelInfo.xp || 0}`, inline: true },
        { name: '🎯 Progression', value: `${levelInfo.progress || '0%'}`, inline: true }
      );
    }

    return embed;
  }

  // Activer/désactiver les images TBATE
  toggleTBATEImages(enabled = null) {
    if (enabled !== null) {
      this.useTBATEImages = enabled;
    } else {
      this.useTBATEImages = !this.useTBATEImages;
    }
    return this.useTBATEImages;
  }

  // Obtenir des informations sur les images TBATE
  getTBATEInfo() {
    return {
      enabled: this.useTBATEImages,
      message: 'Système d\'images désactivé'
    };
  }
}

module.exports = new EmbedConfig();
