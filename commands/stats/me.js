const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats-me')
    .setDescription('Obtenez vos statistiques sur le serveur'),

  async execute(interaction) {
    const statsPath = path.join(__dirname, '../../data/stats.json');
    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));

    const userStats = stats.users[interaction.user.id] || { messages: 0 };

    const embed = new EmbedBuilder()
      .setTitle(`📊 Statistiques de ${interaction.user.tag}`)
      .setDescription(`Messages envoyés : **${userStats.messages}**`)
      .setColor('#00FFFF')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};