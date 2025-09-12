const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("anime-danser")
    .setDescription("Montrez vos talents de danseur"),

  async execute(interaction) {
    const res = await fetch("https://api.waifu.pics/sfw/dance");
    const data = await res.json();

    const embed = new EmbedBuilder()
      .setTitle("🕺 Danse !")
      .setDescription(`${interaction.user} montre ses talents de danseur 💃`)
      .setImage(data.url)
      .setColor("Blue");

    await interaction.reply({ embeds: [embed] });
  },
};