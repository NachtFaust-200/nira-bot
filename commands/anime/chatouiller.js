const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("anime-chatouiller")
    .setDescription("Chatouillez un membre")
    .addUserOption(option =>
      option.setName("membre").setDescription("La personne à chatouiller").setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("membre");
    const res = await fetch("https://api.waifu.pics/sfw/tickle");
    const data = await res.json();

    const embed = new EmbedBuilder()
      .setTitle("😂 Chatouilles !")
      .setDescription(`${interaction.user} chatouille ${user} 🎉`)
      .setImage(data.url)
      .setColor("Yellow");

    await interaction.reply({ embeds: [embed] });
  },
};