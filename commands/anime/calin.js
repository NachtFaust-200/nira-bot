const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("anime-calin")
    .setDescription("Envoyez un câlin à un membre")
    .addUserOption(option =>
      option.setName("membre").setDescription("Le membre à câliner").setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("membre");
    const res = await fetch("https://api.waifu.pics/sfw/hug");
    const data = await res.json();

    const embed = new EmbedBuilder()
      .setTitle("🤗 Câlin !")
      .setDescription(`${interaction.user} fait un câlin à ${user} ❤️`)
      .setImage(data.url)
      .setColor("Random");

    await interaction.reply({ embeds: [embed] });
  },
};