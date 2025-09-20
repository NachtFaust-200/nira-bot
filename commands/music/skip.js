const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Passe à la musique suivante"),

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
      // Passer la musique (arrêter la connexion actuelle)
      const connection = interaction.guild.members.me.voice.connection;
      if (connection) {
        connection.destroy();
      }

      const embed = new EmbedBuilder()
        .setTitle("⏭️ Musique passée")
        .setDescription("La musique a été passée avec succès.")
        .setColor("#FFA500")
        .addFields(
          { name: "🎧 Salon", value: `${voiceChannel.name}`, inline: true },
          { name: "👤 Passé par", value: `${interaction.user.tag}`, inline: true }
        )
        .setFooter({ text: "Musique chill passée", iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Log Discord si disponible
      const guildLogger = client.discordLoggers?.get(interaction.guild.id);
      if (guildLogger && guildLogger.isInitialized()) {
        await guildLogger.logEvent("musique_skip", {
          user: interaction.user.tag,
          channel: voiceChannel.name
        });
      }
      logger.info(`Musique passée par ${interaction.user.tag} dans ${voiceChannel.name}`);

    } catch (error) {
      logger.error("Erreur lors du passage de la musique", error);
      if (client.discordLoggers?.get(interaction.guild.id)) {
        await client.discordLoggers.get(interaction.guild.id).logError(error, { command: "skip", user: interaction.user.tag });
      }
      await interaction.reply({
        content: "❌ Une erreur est survenue lors du passage de la musique.",
        ephemeral: true
      });
    }
  },
};
