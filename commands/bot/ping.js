const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bot-ping")
    .setDescription("Vérifie la latence du bot et de l'API Discord"),

  async execute(interaction) {
    const sent = await interaction.reply({ content: "🏓 Calcul de la latence...", fetchReply: true });

    const embed = new EmbedBuilder()
      .setTitle("🏓 Ping du bot")
      .addFields(
        { name: "Latence Bot", value: `${sent.createdTimestamp - interaction.createdTimestamp}ms`, inline: true },
        { name: "Latence API", value: `${interaction.client.ws.ping}ms`, inline: true }
      )
      .setColor("Yellow")
      .setTimestamp();

    await interaction.editReply({ content: null, embeds: [embed] });
  },
};