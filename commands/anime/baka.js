const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("anime-baka")
    .setDescription("Envoyez un 'baka' à un membre")
    .addUserOption(option =>
      option.setName("membre").setDescription("La personne à traiter de baka").setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("membre");
    const res = await fetch("https://api.waifu.pics/sfw/slap");
    const data = await res.json();

    const embed = new EmbedBuilder()
      .setTitle("😡 Baka !")
      .setDescription(`${interaction.user} dit à ${user} : BAKA !!`)
      .setImage(data.url)
      .setColor("Red");

    await interaction.reply({ embeds: [embed] });
  },
};