// Système de niveaux/XP complet
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class LevelSystem {
  constructor() {
    this.dataPath = path.join(__dirname, '../data/levels.json');
    this.configPath = path.join(__dirname, '../data/levelConfig.json');
    this.initializeData();
  }

  // Initialiser les données
  initializeData() {
    // Créer le dossier data s'il n'existe pas
    const dataDir = path.dirname(this.dataPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialiser les données de niveaux
    if (!fs.existsSync(this.dataPath)) {
      fs.writeFileSync(this.dataPath, JSON.stringify({}, null, 2));
      logger.info('Fichier de niveaux initialisé');
    }

    // Initialiser la configuration
    if (!fs.existsSync(this.configPath)) {
      const defaultConfig = {
        xpPerMessage: { min: 15, max: 25 },
        xpPerVoiceMinute: 10,
        xpPerReaction: 5,
        xpPerCommand: 3,
        cooldown: 60000, // 1 minute
        levelUpMultiplier: 1.2,
        maxLevel: 1000,
        rewards: {
          5: { type: 'role', name: 'Nouveau', color: '#00FF00' },
          10: { type: 'role', name: 'Actif', color: '#0099FF' },
          25: { type: 'role', name: 'Régulier', color: '#FF6B6B' },
          50: { type: 'role', name: 'Vétéran', color: '#FFD700' },
          100: { type: 'role', name: 'Légende', color: '#FF1493' },
          200: { type: 'role', name: 'Mythique', color: '#8A2BE2' },
          500: { type: 'role', name: 'Divin', color: '#FF4500' }
        }
      };
      fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2));
      logger.info('Configuration de niveaux initialisée');
    }
  }

  // Charger les données
  loadData() {
    try {
      return JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
    } catch (error) {
      logger.error('Erreur lors du chargement des données de niveaux', error);
      return {};
    }
  }

  // Sauvegarder les données
  saveData(data) {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde des données de niveaux', error);
      return false;
    }
  }

  // Charger la configuration
  loadConfig() {
    try {
      return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
    } catch (error) {
      logger.error('Erreur lors du chargement de la configuration de niveaux', error);
      return null;
    }
  }

  // Sauvegarder la configuration
  saveConfig(config) {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      return true;
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde de la configuration de niveaux', error);
      return false;
    }
  }

  // Calculer le niveau à partir de l'XP
  calculateLevel(xp) {
    const config = this.loadConfig();
    if (!config) return 1;

    let level = 1;
    let requiredXP = 100;

    while (xp >= requiredXP && level < config.maxLevel) {
      xp -= requiredXP;
      level++;
      requiredXP = Math.floor(requiredXP * config.levelUpMultiplier);
    }

    return level;
  }

  // Calculer l'XP requis pour le niveau suivant
  calculateRequiredXP(currentLevel) {
    const config = this.loadConfig();
    if (!config) return 100;

    let requiredXP = 100;
    for (let i = 1; i < currentLevel; i++) {
      requiredXP = Math.floor(requiredXP * config.levelUpMultiplier);
    }
    return requiredXP;
  }

  // Calculer l'XP total pour atteindre un niveau
  calculateTotalXPForLevel(targetLevel) {
    const config = this.loadConfig();
    if (!config) return 0;

    let totalXP = 0;
    let requiredXP = 100;

    for (let i = 1; i < targetLevel; i++) {
      totalXP += requiredXP;
      requiredXP = Math.floor(requiredXP * config.levelUpMultiplier);
    }

    return totalXP;
  }

  // Obtenir les informations d'un utilisateur
  getUserData(guildId, userId) {
    const data = this.loadData();
    const key = `${guildId}-${userId}`;
    
    if (!data[key]) {
      data[key] = {
        xp: 0,
        level: 1,
        totalMessages: 0,
        totalVoiceTime: 0,
        totalReactions: 0,
        totalCommands: 0,
        lastActivity: Date.now(),
        levelUpNotifications: true,
        achievements: []
      };
      this.saveData(data);
    }

    return data[key];
  }

  // Ajouter de l'XP
  addXP(guildId, userId, amount, type = 'message') {
    const data = this.loadData();
    const key = `${guildId}-${userId}`;
    const userData = this.getUserData(guildId, userId);
    const config = this.loadConfig();

    if (!config) return { success: false, error: 'Configuration non trouvée' };

    // Vérifier le cooldown
    const now = Date.now();
    if (now - userData.lastActivity < config.cooldown) {
      return { success: false, error: 'Cooldown actif' };
    }

    // Ajouter l'XP
    const oldLevel = userData.level;
    userData.xp += amount;
    userData.level = this.calculateLevel(userData.xp);
    userData.lastActivity = now;

    // Mettre à jour les statistiques
    switch (type) {
      case 'message':
        userData.totalMessages++;
        break;
      case 'voice':
        userData.totalVoiceTime += amount / config.xpPerVoiceMinute;
        break;
      case 'reaction':
        userData.totalReactions++;
        break;
      case 'command':
        userData.totalCommands++;
        break;
    }

    // Vérifier si l'utilisateur a monté de niveau
    const leveledUp = userData.level > oldLevel;
    const newLevel = userData.level;
    const requiredXP = this.calculateRequiredXP(newLevel + 1);
    const currentLevelXP = userData.xp - this.calculateTotalXPForLevel(newLevel);

    data[key] = userData;
    this.saveData(data);

    return {
      success: true,
      leveledUp,
      oldLevel,
      newLevel,
      xp: userData.xp,
      currentLevelXP,
      requiredXP,
      userData
    };
  }

  // Obtenir le classement
  getLeaderboard(guildId, limit = 10) {
    const data = this.loadData();
    const guildUsers = [];

    // Filtrer les utilisateurs du serveur
    for (const [key, userData] of Object.entries(data)) {
      if (key.startsWith(`${guildId}-`)) {
        const userId = key.split('-')[1];
        guildUsers.push({
          userId,
          ...userData
        });
      }
    }

    // Trier par XP
    guildUsers.sort((a, b) => b.xp - a.xp);

    return guildUsers.slice(0, limit);
  }

  // Obtenir la position d'un utilisateur
  getUserRank(guildId, userId) {
    const leaderboard = this.getLeaderboard(guildId, 1000);
    const userIndex = leaderboard.findIndex(user => user.userId === userId);
    
    return userIndex === -1 ? null : userIndex + 1;
  }

  // Vérifier les récompenses
  checkRewards(guildId, userId, newLevel) {
    const config = this.loadConfig();
    if (!config || !config.rewards) return [];

    const rewards = [];
    const userData = this.getUserData(guildId, userId);

    for (const [level, reward] of Object.entries(config.rewards)) {
      const rewardLevel = parseInt(level);
      if (newLevel >= rewardLevel && !userData.achievements.includes(rewardLevel)) {
        rewards.push({
          level: rewardLevel,
          ...reward
        });
        userData.achievements.push(rewardLevel);
      }
    }

    if (rewards.length > 0) {
      const data = this.loadData();
      data[`${guildId}-${userId}`] = userData;
      this.saveData(data);
    }

    return rewards;
  }

  // Réinitialiser les données d'un utilisateur
  resetUser(guildId, userId) {
    const data = this.loadData();
    const key = `${guildId}-${userId}`;
    
    if (data[key]) {
      delete data[key];
      this.saveData(data);
      return true;
    }
    
    return false;
  }

  // Réinitialiser toutes les données d'un serveur
  resetGuild(guildId) {
    const data = this.loadData();
    let deleted = 0;

    for (const key of Object.keys(data)) {
      if (key.startsWith(`${guildId}-`)) {
        delete data[key];
        deleted++;
      }
    }

    this.saveData(data);
    return deleted;
  }

  // Obtenir les statistiques globales
  getGlobalStats() {
    const data = this.loadData();
    const stats = {
      totalUsers: 0,
      totalXP: 0,
      totalMessages: 0,
      totalVoiceTime: 0,
      totalReactions: 0,
      totalCommands: 0,
      averageLevel: 0,
      topLevel: 0
    };

    for (const userData of Object.values(data)) {
      stats.totalUsers++;
      stats.totalXP += userData.xp;
      stats.totalMessages += userData.totalMessages;
      stats.totalVoiceTime += userData.totalVoiceTime;
      stats.totalReactions += userData.totalReactions;
      stats.totalCommands += userData.totalCommands;
      
      if (userData.level > stats.topLevel) {
        stats.topLevel = userData.level;
      }
    }

    if (stats.totalUsers > 0) {
      stats.averageLevel = (stats.totalXP / stats.totalUsers) / 100; // Approximation
    }

    return stats;
  }
}

module.exports = new LevelSystem();
