const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats-counter')
    .setDescription('Statistiques d’un salon ou d’une catégorie')
    .addChannelOption(option =>
      option.setName('salon')
        .setDescription('Salon ou catégorie')
        .setRequired(true)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('salon');
    const statsPath = path.join(__dirname, '../../data/stats.json');
    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));

    let description = '';
    if (channel.type === ChannelType.GuildText) {
      const msgs = stats.channels[channel.id]?.messages || 0;
      description = `💬 Messages envoyés dans ce salon : **${msgs}**`;
    } else if (channel.type === ChannelType.GuildCategory) {
      const count = channel.children.size;
      description = `📂 Nombre de salons dans cette catégorie : **${count}**`;
    } else {
      description = '❌ Type de salon non supporté.';
    }

    const embed = new EmbedBuilder()
      .setTitle(`📊 Statistiques pour ${channel.name}`)
      .setDescription(description)
      .setColor('#00FF00')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};