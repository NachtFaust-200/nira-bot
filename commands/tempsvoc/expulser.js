const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tempvoc-expulser")
    .setDescription("Expulser un membre de ton salon vocal temporaire")
    .addUserOption(option =>
      option.setName("membre")
        .setDescription("Le membre à expulser")
        .setRequired(true)
    ),

  async execute(interaction) {
    const member = interaction.options.getMember("membre");
    const channel = interaction.member.voice.channel;

    if (!channel) {
      return interaction.reply({ content: "❌ Vous devez être dans un salon vocal temporaire.", ephemeral: true });
    }

    if (!member || !member.voice.channel || member.voice.channel.id !== channel.id) {
      return interaction.reply({ content: "❌ Ce membre n’est pas dans ton salon vocal.", ephemeral: true });
    }

    await member.voice.disconnect();

    const embed = new EmbedBuilder()
      .setTitle("👢 Membre expulsé")
      .setDescription(`${member} a été expulsé de **${channel.name}**`)
      .setColor("Red")
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};