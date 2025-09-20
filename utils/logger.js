// utils/logger.js - Système de logs simple et efficace
const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureDirectories();
  }

  ensureDirectories() {
    const dirs = ['commands', 'errors', 'events', 'voice'];
    dirs.forEach(dir => {
      const dirPath = path.join(this.logDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message, data = null) {
    const timestamp = this.getTimestamp();
    let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      logMessage += `\nData: ${JSON.stringify(data, null, 2)}`;
    }
    
    return logMessage;
  }

  writeToFile(category, level, message, data = null) {
    const date = new Date().toISOString().split('T')[0];
    const filename = `${date}.log`;
    const filepath = path.join(this.logDir, category, filename);
    
    const logMessage = this.formatMessage(level, message, data) + '\n';
    
    try {
      fs.appendFileSync(filepath, logMessage);
    } catch (error) {
      console.error('Erreur écriture log:', error);
    }
  }

  // Méthodes de logging
  info(message, data = null, category = 'events') {
    console.log(`[INFO] ${message}`);
    this.writeToFile(category, 'info', message, data);
  }

  error(message, data = null, category = 'errors') {
    console.error(`[ERROR] ${message}`);
    this.writeToFile(category, 'error', message, data);
  }

  warn(message, data = null, category = 'events') {
    console.warn(`[WARN] ${message}`);
    this.writeToFile(category, 'warn', message, data);
  }

  success(message, data = null, category = 'events') {
    console.log(`[SUCCESS] ${message}`);
    this.writeToFile(category, 'success', message, data);
  }

  // Logs spécialisés
  command(commandName, user, guild, success, executionTime) {
    const message = `Commande ${commandName} ${success ? 'réussie' : 'échouée'} par ${user.tag}`;
    const data = {
      command: commandName,
      user: user.tag,
      guild: guild?.name || 'DM',
      success,
      executionTime: executionTime ? `${executionTime}ms` : null
    };
    
    if (success) {
      this.info(message, data, 'commands');
    } else {
      this.error(message, data, 'commands');
    }
  }

  voice(action, member, channel, oldChannel = null) {
    const message = `${member.user.tag} ${action}`;
    const data = {
      action,
      member: member.user.tag,
      channel: channel?.name || null,
      oldChannel: oldChannel?.name || null
    };
    
    this.info(message, data, 'voice');
  }

  event(eventName, data = null) {
    const message = `Événement ${eventName}`;
    this.info(message, data, 'events');
  }
}

module.exports = new Logger();