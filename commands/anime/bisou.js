const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("anime-bisou")
    .setDescription("Envoyez un bisou à un membre")
    .addUserOption(option =>
      option.setName("membre")
        .setDescription("Le membre à embrasser")
        .setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("membre");

    const res = await fetch("https://api.waifu.pics/sfw/kiss");
    const data = await res.json();

    const embed = new EmbedBuilder()
      .setTitle("💋 Bisou !")
      .setDescription(`${interaction.user} embrasse ${user} 💖`)
      .setImage(data.url)
      .setColor("#FFC0CB"); // ✅ Code hexadécimal

    await interaction.reply({ embeds: [embed] });
  },
};