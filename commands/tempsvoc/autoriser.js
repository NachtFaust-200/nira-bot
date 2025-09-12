const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tempvoc-autoriser")
    .setDescription("Autoriser un membre à rejoindre ton salon vocal temporaire")
    .addUserOption(option =>
      option.setName("membre")
        .setDescription("Le membre à autoriser")
        .setRequired(true)
    ),

  async execute(interaction) {
    const member = interaction.options.getUser("membre");
    const channel = interaction.member.voice.channel;

    if (!channel) {
      return interaction.reply({ content: "❌ Vous devez être dans un salon vocal temporaire.", ephemeral: true });
    }

    await channel.permissionOverwrites.edit(member.id, { Connect: true, ViewChannel: true });

    const embed = new EmbedBuilder()
      .setTitle("✅ Membre autorisé")
      .setDescription(`${member} peut désormais rejoindre **${channel.name}**`)
      .setColor("Green")
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};