const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tempvoc-afficher")
    .setDescription("Activer ou désactiver la visibilité du salon vocal temporaire")
    .addStringOption(option =>
      option
        .setName("mode")
        .setDescription("Choisir entre On (visible) ou Off (invisible)")
        .setRequired(true)
        .addChoices(
          { name: "On (visible)", value: "on" },
          { name: "Off (invisible)", value: "off" }
        )
    ),

  async execute(interaction) {
    const mode = interaction.options.getString("mode");
    const channel = interaction.member.voice.channel;

    if (!channel) {
      return interaction.reply({ content: "❌ Vous devez être dans un salon vocal temporaire.", ephemeral: true });
    }

    if (mode === "on") {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        ViewChannel: true,
        Connect: true
      });

      const embed = new EmbedBuilder()
        .setTitle("👁️ Salon vocal affiché")
        .setDescription(`Le salon **${channel.name}** est maintenant **visible pour tout le serveur**.`)
        .setColor("Green")
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (mode === "off") {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        ViewChannel: false,
        Connect: false
      });

      const embed = new EmbedBuilder()
        .setTitle("🙈 Salon vocal caché")
        .setDescription(`Le salon **${channel.name}** est maintenant **invisible pour le serveur**.`)
        .setColor("Red")
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  }
};