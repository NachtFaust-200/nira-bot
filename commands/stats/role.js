const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats-role')
    .setDescription('Statistiques d’un rôle')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Le rôle à analyser')
        .setRequired(true)
    ),

  async execute(interaction) {
    const role = interaction.options.getRole('role');

    const embed = new EmbedBuilder()
      .setTitle(`📊 Statistiques du rôle : ${role.name}`)
      .setDescription(`Nombre de membres : **${role.members.size}**`)
      .setColor('#800080')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};