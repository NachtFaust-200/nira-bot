const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Arrête la musique en cours de lecture"),

  async execute(interaction, client) {
    const voiceChannel = interaction.member.voice.channel;

    // Vérifications
    if (!voiceChannel) {
      return interaction.reply({
        content: "❌ Vous devez être dans un salon vocal pour utiliser cette commande.",
        ephemeral: true
      });
    }

    if (!interaction.guild.members.me.voice.channel) {
      return interaction.reply({
        content: "❌ Je ne suis pas dans un salon vocal.",
        ephemeral: true
      });
    }

    if (voiceChannel.id !== interaction.guild.members.me.voice.channel.id) {
      return interaction.reply({
        content: "❌ Vous devez être dans le même salon vocal que le bot.",
        ephemeral: true
      });
    }

    try {
      // Arrêter la musique et déconnecter le bot
      const connection = interaction.guild.members.me.voice.connection;
      if (connection) {
        connection.destroy();
      }

      const embed = new EmbedBuilder()
        .setTitle("⏹️ Musique arrêtée")
        .setDescription("La musique a été arrêtée avec succès.")
        .setColor("#FF4444")
        .addFields(
          { name: "🎧 Salon", value: `${voiceChannel.name}`, inline: true },
          { name: "👤 Arrêté par", value: `${interaction.user.tag}`, inline: true }
        )
        .setFooter({ text: "Musique chill arrêtée", iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Log Discord si disponible
      const guildLogger = client.discordLoggers?.get(interaction.guild.id);
      if (guildLogger && guildLogger.isInitialized()) {
        await guildLogger.logEvent("musique_stop", {
          user: interaction.user.tag,
          channel: voiceChannel.name
        });
      }
      logger.info(`Musique arrêtée par ${interaction.user.tag} dans ${voiceChannel.name}`);

    } catch (error) {
      logger.error("Erreur lors de l'arrêt de la musique", error);
      if (client.discordLoggers?.get(interaction.guild.id)) {
        await client.discordLoggers.get(interaction.guild.id).logError(error, { command: "stop", user: interaction.user.tag });
      }
      await interaction.reply({
        content: "❌ Une erreur est survenue lors de l'arrêt de la musique.",
        ephemeral: true
      });
    }
  },
};
