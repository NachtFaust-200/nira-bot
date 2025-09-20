// Système de tickets complet
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class TicketSystem {
  constructor() {
    this.dataPath = path.join(__dirname, '../data/tickets.json');
    this.configPath = path.join(__dirname, '../data/ticketConfig.json');
    this.initializeData();
  }

  // Initialiser les données
  initializeData() {
    // Créer le dossier data s'il n'existe pas
    const dataDir = path.dirname(this.dataPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialiser les données de tickets
    if (!fs.existsSync(this.dataPath)) {
      fs.writeFileSync(this.dataPath, JSON.stringify({}, null, 2));
      logger.info('Fichier de tickets initialisé');
    }

    // Initialiser la configuration
    if (!fs.existsSync(this.configPath)) {
      const defaultConfig = {
        enabled: true,
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
      fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2));
      logger.info('Configuration de tickets initialisée');
    }
  }

  // Charger les données
  loadData() {
    try {
      return JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
    } catch (error) {
      logger.error('Erreur lors du chargement des données de tickets', error);
      return {};
    }
  }

  // Sauvegarder les données
  saveData(data) {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde des données de tickets', error);
      return false;
    }
  }

  // Charger la configuration
  loadConfig() {
    try {
      return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
    } catch (error) {
      logger.error('Erreur lors du chargement de la configuration de tickets', error);
      return null;
    }
  }

  // Sauvegarder la configuration
  saveConfig(config) {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      return true;
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde de la configuration de tickets', error);
      return false;
    }
  }

  // Créer un ticket
  createTicket(guildId, userId, category, reason = '') {
    const data = this.loadData();
    const config = this.loadConfig();
    
    if (!config || !config.enabled) {
      return { success: false, error: 'Système de tickets désactivé' };
    }

    // Vérifier le nombre maximum de tickets par utilisateur
    const userTickets = this.getUserTickets(guildId, userId);
    if (userTickets.length >= config.settings.maxTicketsPerUser) {
      return { success: false, error: `Vous avez déjà ${config.settings.maxTicketsPerUser} tickets ouverts` };
    }

    // Vérifier si la catégorie existe
    if (!config.categories[category]) {
      return { success: false, error: 'Catégorie de ticket invalide' };
    }

    // Vérifier si une raison est requise
    if (config.settings.requireReason && !reason.trim()) {
      return { success: false, error: 'Une raison est requise pour créer un ticket' };
    }

    // Générer un ID unique pour le ticket
    const ticketId = this.generateTicketId();
    const ticketData = {
      id: ticketId,
      guildId: guildId,
      userId: userId,
      category: category,
      reason: reason,
      status: 'open',
      createdAt: Date.now(),
      closedAt: null,
      closedBy: null,
      participants: [userId],
      messages: []
    };

    // Sauvegarder le ticket
    if (!data[guildId]) data[guildId] = {};
    data[guildId][ticketId] = ticketData;
    this.saveData(data);

    return { success: true, ticket: ticketData };
  }

  // Fermer un ticket
  closeTicket(guildId, ticketId, closedBy) {
    const data = this.loadData();
    
    if (!data[guildId] || !data[guildId][ticketId]) {
      return { success: false, error: 'Ticket non trouvé' };
    }

    const ticket = data[guildId][ticketId];
    if (ticket.status === 'closed') {
      return { success: false, error: 'Ticket déjà fermé' };
    }

    ticket.status = 'closed';
    ticket.closedAt = Date.now();
    ticket.closedBy = closedBy;

    this.saveData(data);
    return { success: true, ticket: ticket };
  }

  // Rouvrir un ticket
  reopenTicket(guildId, ticketId, reopenedBy) {
    const data = this.loadData();
    
    if (!data[guildId] || !data[guildId][ticketId]) {
      return { success: false, error: 'Ticket non trouvé' };
    }

    const ticket = data[guildId][ticketId];
    if (ticket.status === 'open') {
      return { success: false, error: 'Ticket déjà ouvert' };
    }

    ticket.status = 'open';
    ticket.closedAt = null;
    ticket.closedBy = null;

    this.saveData(data);
    return { success: true, ticket: ticket };
  }

  // Ajouter un participant au ticket
  addParticipant(guildId, ticketId, userId) {
    const data = this.loadData();
    
    if (!data[guildId] || !data[guildId][ticketId]) {
      return { success: false, error: 'Ticket non trouvé' };
    }

    const ticket = data[guildId][ticketId];
    if (ticket.status === 'closed') {
      return { success: false, error: 'Impossible d\'ajouter des participants à un ticket fermé' };
    }

    if (!ticket.participants.includes(userId)) {
      ticket.participants.push(userId);
      this.saveData(data);
    }

    return { success: true, ticket: ticket };
  }

  // Retirer un participant du ticket
  removeParticipant(guildId, ticketId, userId) {
    const data = this.loadData();
    
    if (!data[guildId] || !data[guildId][ticketId]) {
      return { success: false, error: 'Ticket non trouvé' };
    }

    const ticket = data[guildId][ticketId];
    if (ticket.status === 'closed') {
      return { success: false, error: 'Impossible de retirer des participants d\'un ticket fermé' };
    }

    if (ticket.participants.includes(userId)) {
      ticket.participants = ticket.participants.filter(id => id !== userId);
      this.saveData(data);
    }

    return { success: true, ticket: ticket };
  }

  // Obtenir les tickets d'un utilisateur
  getUserTickets(guildId, userId) {
    const data = this.loadData();
    if (!data[guildId]) return [];

    return Object.values(data[guildId]).filter(ticket => 
      ticket.userId === userId || ticket.participants.includes(userId)
    );
  }

  // Obtenir tous les tickets d'un serveur
  getGuildTickets(guildId, status = 'all') {
    const data = this.loadData();
    if (!data[guildId]) return [];

    const tickets = Object.values(data[guildId]);
    if (status === 'all') return tickets;
    return tickets.filter(ticket => ticket.status === status);
  }

  // Obtenir un ticket par ID
  getTicket(guildId, ticketId) {
    const data = this.loadData();
    if (!data[guildId] || !data[guildId][ticketId]) return null;
    return data[guildId][ticketId];
  }

  // Supprimer un ticket
  deleteTicket(guildId, ticketId) {
    const data = this.loadData();
    
    if (!data[guildId] || !data[guildId][ticketId]) {
      return { success: false, error: 'Ticket non trouvé' };
    }

    delete data[guildId][ticketId];
    this.saveData(data);
    return { success: true };
  }

  // Nettoyer les anciens tickets
  cleanupOldTickets(guildId) {
    const data = this.loadData();
    const config = this.loadConfig();
    
    if (!data[guildId] || !config) return 0;

    const autoCloseDays = config.settings.autoCloseAfterDays;
    const cutoffTime = Date.now() - (autoCloseDays * 24 * 60 * 60 * 1000);
    let deleted = 0;

    for (const [ticketId, ticket] of Object.entries(data[guildId])) {
      if (ticket.status === 'open' && ticket.createdAt < cutoffTime) {
        ticket.status = 'closed';
        ticket.closedAt = Date.now();
        ticket.closedBy = 'system';
        deleted++;
      }
    }

    if (deleted > 0) {
      this.saveData(data);
    }

    return deleted;
  }

  // Générer un ID de ticket unique
  generateTicketId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Obtenir les statistiques des tickets
  getStats(guildId) {
    const tickets = this.getGuildTickets(guildId);
    const openTickets = tickets.filter(t => t.status === 'open').length;
    const closedTickets = tickets.filter(t => t.status === 'closed').length;
    const totalTickets = tickets.length;

    // Calculer les tickets par catégorie
    const categoryStats = {};
    tickets.forEach(ticket => {
      categoryStats[ticket.category] = (categoryStats[ticket.category] || 0) + 1;
    });

    return {
      total: totalTickets,
      open: openTickets,
      closed: closedTickets,
      byCategory: categoryStats
    };
  }
}

module.exports = new TicketSystem();
