// utils/discordLogger.js - Système de logs Discord simple
const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const logger = require('./logger');

class DiscordLogger {
  constructor(client) {
    this.client = client;
    this.logChannels = new Map();
    this.initialized = false;
  }

  async initialize(guild) {
    try {
      if (this.initialized) return true;

      // Vérifier les permissions
      if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
        logger.warn("Permissions insuffisantes pour créer les salons de logs");
        return false;
      }

      // Chercher la catégorie existante
      const category = guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name === "📊 Logs"
      );

      if (category) {
        // Catégorie existe, chercher les salons existants
        await this.findExistingChannels(guild, category);
        
        // Vérifier si tous les salons existent
        const requiredChannels = ['command-logs', 'error-logs', 'event-logs', 'voice-logs'];
        const missingChannels = requiredChannels.filter(name => !this.logChannels.has(name));
        
        if (missingChannels.length > 0) {
          logger.info(`Salons manquants détectés: ${missingChannels.join(', ')}`);
          await this.createChannels(guild, category);
        }
        
        this.initialized = true;
        logger.success("Système de logs Discord réactivé");
        return true;
      } else {
        // Créer la catégorie et les salons
        const newCategory = await this.createCategory(guild);
        if (!newCategory) return false;

        await this.createChannels(guild, newCategory);
        this.initialized = true;
        logger.success("Système de logs Discord initialisé");
        return true;
      }

    } catch (error) {
      logger.error("Erreur initialisation logs Discord", error);
      return false;
    }
  }

  async createCategory(guild) {
    try {
      // Chercher la catégorie existante
      let category = guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name === "📊 Logs"
      );

      if (!category) {
        category = await guild.channels.create({
          name: "📊 Logs",
          type: ChannelType.GuildCategory,
          position: 0,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel]
            }
          ]
        });
        logger.info("Catégorie Logs créée");
      }

      return category;
    } catch (error) {
      logger.error("Erreur création catégorie", error);
      return null;
    }
  }

  async findExistingChannels(guild, category) {
    // IDs des salons de logs existants
    const channelIds = {
      "command-logs": "1418686252105990324",
      "error-logs": "1418686263820550214", 
      "event-logs": "1418686267675115660",
      "voice-logs": "1418686288277536962"
    };

    for (const [logType, channelId] of Object.entries(channelIds)) {
      try {
        const channel = guild.channels.cache.get(channelId);
        
        if (channel) {
          this.logChannels.set(logType, channel);
          logger.info(`Salon ${channel.name} (${logType}) trouvé et réactivé`);
        } else {
          logger.warn(`Salon ${logType} avec ID ${channelId} non trouvé`);
        }
      } catch (error) {
        logger.error(`Erreur recherche salon ${logType}`, error);
      }
    }
  }

  async createChannels(guild, category) {
    // IDs des salons de logs existants
    const channelIds = {
      "command-logs": "1418686252105990324",
      "error-logs": "1418686263820550214", 
      "event-logs": "1418686267675115660",
      "voice-logs": "1418686288277536962"
    };

    const channels = [
      { name: "📝 command-logs", logType: "command-logs", emoji: "📝", color: "#00BFFF" },
      { name: "❌ error-logs", logType: "error-logs", emoji: "❌", color: "#FF4444" },
      { name: "📅 event-logs", logType: "event-logs", emoji: "📅", color: "#00FF00" },
      { name: "🎧 voice-logs", logType: "voice-logs", emoji: "🎧", color: "#9B59B6" }
    ];

    for (const config of channels) {
      try {
        // Vérifier d'abord si le salon existe déjà par ID
        let channel = guild.channels.cache.get(channelIds[config.logType]);
        
        if (!channel) {
          // Si le salon n'existe pas, le créer
          logger.info(`Création du salon ${config.name}...`);
          channel = await guild.channels.create({
            name: config.name,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
              {
                id: guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
              }
            ]
          });

          // Message de bienvenue
          const embed = new EmbedBuilder()
            .setTitle(`${config.emoji} ${config.name}`)
            .setDescription("Ce salon enregistre les logs automatiquement")
            .setColor(config.color)
            .setTimestamp();

          await channel.send({ embeds: [embed] });
          logger.success(`Salon ${config.name} créé`);
        } else {
          logger.info(`Salon ${channel.name} existe déjà`);
        }

        this.logChannels.set(config.logType, channel);

      } catch (error) {
        logger.error(`Erreur création salon ${config.name}`, error);
      }
    }
  }

  async logCommand(commandName, user, guild, success, executionTime, error = null) {
    const channel = this.logChannels.get('command-logs');
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle("📝 Commande Exécutée")
      .setColor(success ? "#00BFFF" : "#FF4444")
      .addFields(
        { name: "🔧 Commande", value: `\`/${commandName}\``, inline: true },
        { name: "👤 Utilisateur", value: `${user}`, inline: true },
        { name: "🏠 Serveur", value: guild ? guild.name : "DM", inline: true },
        { name: "⏱️ Temps", value: `${executionTime}ms`, inline: true },
        { name: "✅ Statut", value: success ? "Succès" : "Échec", inline: true }
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    if (error) {
      embed.addFields({ name: "❌ Erreur", value: `\`${error.message}\``, inline: false });
    }

    try {
      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.error("Erreur envoi log commande", err);
    }
  }

  async logError(error, context = null) {
    const channel = this.logChannels.get('error-logs');
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle("❌ Erreur Détectée")
      .setColor("#FF4444")
      .addFields(
        { name: "🚨 Type", value: error.name || "Unknown", inline: true },
        { name: "📝 Message", value: `\`${error.message}\``, inline: false }
      )
      .setTimestamp();

    if (context) {
      embed.addFields({ name: "📍 Contexte", value: `\`${JSON.stringify(context)}\``, inline: false });
    }

    try {
      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.error("Erreur envoi log erreur", err);
    }
  }

  async logVoice(action, member, channel, oldChannel = null) {
    const logChannel = this.logChannels.get('voice-logs');
    if (!logChannel) return;

    let color = "#9B59B6";
    let emoji = "🎧";
    
    if (action.includes("rejoint")) {
      color = "#00FF00";
      emoji = "✅";
    } else if (action.includes("quitté")) {
      color = "#FF4444";
      emoji = "❌";
    } else if (action.includes("changé")) {
      color = "#FFA500";
      emoji = "🔄";
    }

    const embed = new EmbedBuilder()
      .setTitle(`${emoji} ${action}`)
      .setColor(color)
      .addFields(
        { name: "👤 Membre", value: `${member}`, inline: true },
        { name: "🕐 Heure", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    if (channel) {
      embed.addFields({ name: "🎧 Salon", value: `${channel}`, inline: true });
    }

    if (oldChannel) {
      embed.addFields({ name: "⬅️ Ancien", value: `${oldChannel}`, inline: true });
    }

    try {
      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      logger.error("Erreur envoi log vocal", err);
    }
  }

  async logEvent(eventName, data = null) {
    const channel = this.logChannels.get('event-logs');
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle("📅 Événement")
      .setColor("#00FF00")
      .addFields(
        { name: "🎯 Événement", value: `\`${eventName}\``, inline: true },
        { name: "🕐 Heure", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setTimestamp();

    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        embed.addFields({ name: key, value: `\`${value}\``, inline: true });
      });
    }

    try {
      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.error("Erreur envoi log événement", err);
    }
  }

  isInitialized() {
    return this.initialized;
  }
}

module.exports = DiscordLogger;
