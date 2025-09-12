const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
require("dotenv").config();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bot-information")
    .setDescription("Affiche les informations du bot et du créateur"),

  async execute(interaction, client) {
    const totalSeconds = client.uptime / 1000;
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const uptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    const embed = new EmbedBuilder()
      .setTitle("🤖 Informations du bot")
      .setColor("Green")
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { name: "Nom du bot", value: client.user.username, inline: true },
        { name: "Tag du bot", value: `#${client.user.discriminator}`, inline: true },
        { name: "Créé le", value: `<t:${Math.floor(client.user.createdTimestamp / 1000)}:D>`, inline: true },
        { name: "Uptime", value: uptime, inline: true },
        { name: "Serveurs", value: `${client.guilds.cache.size}`, inline: true },
        { name: "Utilisateurs", value: `${client.users.cache.size}`, inline: true },
        { name: "Créateur", value: process.env.CREATOR_TAG, inline: true }
      )
      .setFooter({ text: `Demandé par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};