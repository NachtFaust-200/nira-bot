// index.js
const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits, ChannelType, PermissionsBitField } = require("discord.js");
require("dotenv").config();

// Import du système de logs
const logger = require("./utils/logger");
const DiscordLogger = require("./utils/discordLogger");
const levelSystem = require("./utils/levelSystem");

// -------- 1) Initialisation du système de logs --------
logger.info("Système de logs initialisé");

// -------- 2) Création du client Discord --------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates // nécessaire pour tempvoc
  ],
});

client.commands = new Collection();

// -------- 3) Charger toutes les commandes --------
const loadCommands = () => {
  const foldersPath = path.join(__dirname, "commands");
  const commandFolders = fs.readdirSync(foldersPath);
  let commandCount = 0;

  for (const folder of commandFolders) {
    // Ignorer temporairement le dossier music
    if (folder === 'music') {
      logger.info(`Dossier music ignoré temporairement`);
      continue;
    }
    
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
    
    for (const file of commandFiles) {
      try {
        const command = require(path.join(commandsPath, file));
        if (command.data && command.execute) {
          client.commands.set(command.data.name, command);
          commandCount++;
          logger.info(`Commande chargée: ${command.data.name}`);
        } else {
          logger.warn(`Commande invalide ignorée: ${file}`);
        }
      } catch (error) {
        logger.error(`Erreur chargement commande ${file}`, error);
      }
    }
  }
  
  logger.success(`${commandCount} commandes chargées`);
  return commandCount;
};

loadCommands();

// -------- 4) Gestion des stats --------
const statsPath = path.join(__dirname, "data/stats.json");

const initializeStats = () => {
  if (!fs.existsSync(statsPath)) {
    fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });
    fs.writeFileSync(statsPath, JSON.stringify({ 
      users: {}, 
      channels: {},
      guilds: {},
      lastUpdated: new Date().toISOString()
    }, null, 2));
    logger.info("Fichier de statistiques initialisé");
  }
};

const updateStats = (message) => {
  try {
    const stats = JSON.parse(fs.readFileSync(statsPath, "utf8"));

    // Stats par utilisateur
    if (!stats.users[message.author.id]) {
      stats.users[message.author.id] = { 
        messages: 0, 
        username: message.author.username,
        firstSeen: new Date().toISOString()
      };
    }
    stats.users[message.author.id].messages += 1;
    stats.users[message.author.id].lastSeen = new Date().toISOString();

    // Stats par salon
    if (!stats.channels[message.channel.id]) {
      stats.channels[message.channel.id] = { 
        messages: 0,
        name: message.channel.name,
        guildId: message.guild?.id
      };
    }
    stats.channels[message.channel.id].messages += 1;

    // Stats par serveur
    if (message.guild) {
      if (!stats.guilds[message.guild.id]) {
        stats.guilds[message.guild.id] = {
          messages: 0,
          name: message.guild.name,
          memberCount: message.guild.memberCount
        };
      }
      stats.guilds[message.guild.id].messages += 1;
      stats.guilds[message.guild.id].memberCount = message.guild.memberCount;
    }

    stats.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  } catch (error) {
    logger.error("Erreur mise à jour statistiques", error);
  }
};

initializeStats();

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  updateStats(message);

  // Gestion des messages dans les tickets
  await ticketMessages.execute(message, client);

  // Tracking XP pour les messages
  try {
    const config = levelSystem.loadConfig();
    if (config) {
      const xpAmount = Math.floor(Math.random() * (config.xpPerMessage.max - config.xpPerMessage.min + 1)) + config.xpPerMessage.min;
      const xpResult = levelSystem.addXP(message.guild.id, message.author.id, xpAmount, 'message');
      
      if (xpResult.success && xpResult.leveledUp) {
        // Envoyer une notification de niveau si activée
        const userData = levelSystem.getUserData(message.guild.id, message.author.id);
        if (userData.levelUpNotifications) {
          const levelUpEmbed = {
            title: '🎉 Félicitations !',
            description: `**${message.author.username}** a atteint le **niveau ${xpResult.newLevel}** !`,
            color: 0x00FF00,
            thumbnail: { url: message.author.displayAvatarURL({ dynamic: true }) },
            fields: [
              { name: '📊 XP Total', value: `${xpResult.xp.toLocaleString()} XP`, inline: true },
              { name: '🎯 Progression', value: `${xpResult.currentLevelXP.toLocaleString()}/${xpResult.requiredXP.toLocaleString()} XP`, inline: true }
            ],
            timestamp: new Date().toISOString()
          };

          // Envoyer dans le salon où le message a été envoyé
          await message.channel.send({ embeds: [levelUpEmbed] });
        }
      }
    }
  } catch (error) {
    logger.error('Erreur tracking XP message', error);
  }
});

// -------- 5) Gestion des événements de tickets --------
// Charger les événements de tickets
const ticketInteractions = require('./events/ticketInteractions');
const ticketMessages = require('./events/ticketMessages');

// -------- 6) Gestion des commandes slash --------
client.on("interactionCreate", async interaction => {
  // Gestion des interactions de tickets (boutons)
  if (interaction.isButton()) {
    await ticketInteractions.execute(interaction, client);
    return;
  }
  
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    logger.warn(`Commande inconnue: ${interaction.commandName}`);
    return;
  }

  const startTime = Date.now();
  logger.info(`Commande ${interaction.commandName} exécutée par ${interaction.user.tag}`);

  // Tracking XP pour les commandes
  try {
    const xpResult = levelSystem.addXP(interaction.guild.id, interaction.user.id, 3, 'command');
    if (xpResult.success && xpResult.leveledUp) {
      // Envoyer une notification de niveau si activée
      const userData = levelSystem.getUserData(interaction.guild.id, interaction.user.id);
      if (userData.levelUpNotifications) {
        const levelUpEmbed = {
          title: '🎉 Félicitations !',
          description: `**${interaction.user.username}** a atteint le **niveau ${xpResult.newLevel}** !`,
          color: 0x00FF00,
          thumbnail: { url: interaction.user.displayAvatarURL({ dynamic: true }) },
          fields: [
            { name: '📊 XP Total', value: `${xpResult.xp.toLocaleString()} XP`, inline: true },
            { name: '🎯 Progression', value: `${xpResult.currentLevelXP.toLocaleString()}/${xpResult.requiredXP.toLocaleString()} XP`, inline: true }
          ],
          timestamp: new Date().toISOString()
        };

        // Envoyer dans le salon où la commande a été exécutée
        await interaction.followUp({ embeds: [levelUpEmbed] });
      }
    }
  } catch (error) {
    logger.error('Erreur tracking XP commande', error);
  }

  try {
    await command.execute(interaction, client);
    const executionTime = Date.now() - startTime;
    logger.command(interaction.commandName, interaction.user, interaction.guild, true, executionTime);
    
    // Log Discord si disponible
    const guildLogger = client.discordLoggers?.get(interaction.guild?.id);
    if (guildLogger && guildLogger.isInitialized()) {
      await guildLogger.logCommand(interaction.commandName, interaction.user, interaction.guild, true, executionTime);
    }
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.command(interaction.commandName, interaction.user, interaction.guild, false, executionTime);
    logger.error(`Erreur commande ${interaction.commandName}`, error);
    
    // Log Discord si disponible
    const guildLogger = client.discordLoggers?.get(interaction.guild?.id);
    if (guildLogger && guildLogger.isInitialized()) {
      await guildLogger.logCommand(interaction.commandName, interaction.user, interaction.guild, false, executionTime, error);
      await guildLogger.logError(error, { command: interaction.commandName, user: interaction.user.tag });
    }
    
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "❌ Une erreur est survenue !", ephemeral: true });
      } else {
        await interaction.followUp({ content: "❌ Une erreur est survenue !", ephemeral: true });
      }
    } catch (err) {
      logger.error("Impossible de répondre à l'interaction", err);
    }
  }
});

// -------- 6) Gestion des salons vocaux temporaires --------
const tempvocPath = path.join(__dirname, "data/tempvoc.json");
if (!fs.existsSync(tempvocPath)) fs.writeFileSync(tempvocPath, JSON.stringify({ guilds: {} }, null, 2));

function loadTempvoc() {
  return JSON.parse(fs.readFileSync(tempvocPath, "utf8"));
}
function saveTempvoc(cfg) {
  fs.writeFileSync(tempvocPath, JSON.stringify(cfg, null, 2));
}

client.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    const member = newState.member || oldState.member;
    if (!member) return;

    // Logs généraux des connexions/déconnexions vocales
    const guildLogger = client.discordLoggers?.get(newState.guild?.id);
    if (guildLogger && guildLogger.isInitialized()) {
      // Membre rejoint un salon vocal
      if (!oldState.channelId && newState.channelId) {
        const channel = newState.channel;
        await guildLogger.logVoice("A rejoint un salon vocal", member, channel);
        logger.voice("A rejoint un salon vocal", member, channel);
      }
      
      // Membre quitte un salon vocal
      if (oldState.channelId && !newState.channelId) {
        const oldChannel = oldState.channel;
        await guildLogger.logVoice("A quitté un salon vocal", member, null, oldChannel);
        logger.voice("A quitté un salon vocal", member, oldChannel);
      }
      
      // Membre change de salon vocal
      if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        const oldChannel = oldState.channel;
        const newChannel = newState.channel;
        await guildLogger.logVoice("A changé de salon vocal", member, newChannel, oldChannel);
        logger.voice("A changé de salon vocal", member, newChannel, oldChannel);
      }
    }

    // Gestion des salons temporaires
    const config = loadTempvoc();
    const guildId = newState.guild?.id;
    if (!guildId || !config.guilds[guildId]) return;

    const setupChannelId = config.guilds[guildId].setupChannel;
    if (!setupChannelId) return;

    // Membre rejoint le channel setup → créer vocal temporaire
    if (newState.channelId === setupChannelId) {
      if (!member) return;

      const me = newState.guild.members.me;
      if (!me.permissions.has(PermissionsBitField.Flags.ManageChannels)) return;

      const categoryId = newState.channel?.parentId || null;
      const channelName = `${member.user.username} 🎧`;

      const tempChannel = await newState.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: categoryId
      });

      if (!config.guilds[guildId].tempChannels) config.guilds[guildId].tempChannels = [];
      config.guilds[guildId].tempChannels.push(tempChannel.id);
      saveTempvoc(config);

      try { await member.voice.setChannel(tempChannel.id); } catch {}

          // Log Discord si disponible
          if (guildLogger && guildLogger.isInitialized()) {
            await guildLogger.logVoice("Salon temporaire créé", member, tempChannel);
          }
          logger.voice("Salon temporaire créé", member, tempChannel);

      return;
    }

    // Suppression des channels temporaires vides
    if (oldState.channelId) {
      const tempChannels = config.guilds[guildId]?.tempChannels || [];
      if (tempChannels.includes(oldState.channelId)) {
        const oldChannel = oldState.guild.channels.cache.get(oldState.channelId);
        if (oldChannel && oldChannel.members.size === 0) {
          try { 
            await oldChannel.delete("Salon temporaire vide"); 
            
                // Log Discord si disponible
                if (guildLogger && guildLogger.isInitialized()) {
                  await guildLogger.logVoice("Salon temporaire supprimé", oldState.member, null, oldChannel);
                }
                logger.voice("Salon temporaire supprimé", oldState.member, oldChannel);
          } catch {}
          config.guilds[guildId].tempChannels = tempChannels.filter(id => id !== oldState.channelId);
          saveTempvoc(config);
        }
      }
    }
  } catch (err) { 
    console.error("Erreur voiceStateUpdate:", err);
    logger.error("Erreur voiceStateUpdate", err);
  }
});

// -------- 7) Ready --------
client.once("ready", async () => {
  logger.success(`Bot connecté: ${client.user.tag}`);
  logger.event("bot_ready", {
    bot: client.user.tag,
    guilds: client.guilds.cache.size,
    users: client.users.cache.size,
    commands: client.commands.size
  });

  // Les logs Discord seront initialisés via la commande /setup-logs
  logger.info("Bot prêt. Utilisez /setup-logs init pour configurer les logs Discord.");

  // Log Discord si disponible
  if (client.discordLogger && client.discordLogger.isInitialized()) {
    client.discordLogger.logEvent("bot_ready", {
      bot: client.user.tag,
      guilds: client.guilds.cache.size,
      users: client.users.cache.size,
      commands: client.commands.size
    });
  }
});

// -------- 8) Gestion des erreurs --------
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  
  // Log Discord si disponible
  if (client.discordLogger && client.discordLogger.isInitialized()) {
    client.discordLogger.logError(new Error('Unhandled Rejection'), { reason, promise });
  }
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  
  // Log Discord si disponible
  if (client.discordLogger && client.discordLogger.isInitialized()) {
    client.discordLogger.logError(error, { type: 'uncaughtException' });
  }
  
  process.exit(1);
});

// -------- 9) Serveur web pour H24 --------
require("./server");

// -------- 10) Login --------
client.login(process.env.TOKEN).catch(error => {
  logger.error("Erreur connexion bot", error);
  process.exit(1);
});