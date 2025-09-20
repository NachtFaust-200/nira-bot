const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("membre-deplacer")
    .setDescription("Déplace un membre dans un autre salon vocal")
    .addUserOption(option =>
      option.setName("membre")
        .setDescription("Choisis un membre")
        .setRequired(true)
    )
    .addChannelOption(option =>
      option.setName("salon")
        .setDescription("Salon vocal cible")
        .setRequired(true)
        .addChannelTypes(2) // GuildVoice
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

  async execute(interaction) {
    const member = interaction.options.getMember("membre");
    const channel = interaction.options.getChannel("salon");

    if (!member.voice.channel) {
      return interaction.reply({ content: "❌ Ce membre n'est pas dans un salon vocal.", ephemeral: true });
    }

    try {
      await member.voice.setChannel(channel);

      const embed = new EmbedBuilder()
        .setTitle("✅ Membre déplacé")
        .setDescription(`${member.user.tag} a été déplacé vers **${channel.name}**`)
        .setColor("#57F287")
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Impossible de déplacer le membre")
        .setDescription("Vérifie que j'ai les permissions nécessaires et que le membre peut être déplacé.")
        .setColor("#ED4245")
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};