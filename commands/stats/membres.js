const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats-membres')
    .setDescription('Statistiques de tous les membres'),

  async execute(interaction) {
    const statsPath = path.join(__dirname, '../../data/stats.json');
    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));

    const membersStats = Object.entries(stats.users)
      .map(([id, data]) => `<@${id}> : ${data.messages} messages`)
      .join('\n') || 'Aucune donnée disponible';

    const embed = new EmbedBuilder()
      .setTitle('📊 Statistiques des membres')
      .setDescription(membersStats)
      .setColor('#FFA500')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};