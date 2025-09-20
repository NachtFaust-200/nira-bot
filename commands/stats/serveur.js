const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats-serveur')
    .setDescription('Statistiques du serveur'),

  async execute(interaction) {
    const guild = interaction.guild;

    const embed = new EmbedBuilder()
      .setTitle(`📊 Statistiques du serveur : ${guild.name}`)
      .setDescription(`
- Membres : **${guild.memberCount}**
- Salons : **${guild.channels.cache.size}**
- Rôles : **${guild.roles.cache.size}**
- Boosts : **${guild.premiumSubscriptionCount}**
`)
      .setColor('#FFD700')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};