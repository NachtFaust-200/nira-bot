const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Affiche la file d'attente de la musique"),

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
      // Avec le système simplifié, il n'y a pas de file d'attente
      const isPlaying = interaction.guild.members.me.voice.channel !== null;

      const description = "Aucune file d'attente disponible avec le système actuel.\n\n**Commandes disponibles :**\n• `/play` - Jouer une musique (YouTube/Spotify)\n• `/stop` - Arrêter la musique\n• `/skip` - Passer la musique\n• `/volume` - Afficher les infos de volume";

      const embed = new EmbedBuilder()
        .setTitle("📋 File d'attente de la musique")
        .setDescription(description)
        .setColor("#9B59B6")
        .addFields(
          { name: "🎧 Salon", value: `${voiceChannel.name}`, inline: true },
          { name: "▶️ Statut", value: isPlaying ? "En cours" : "Arrêté", inline: true },
          { name: "👤 Demandé par", value: `${interaction.user.tag}`, inline: true },
          { name: "ℹ️ Note", value: "Le système actuel ne supporte pas les files d'attente", inline: false }
        )
        .setFooter({ text: "Musique chill - File d'attente", iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Log Discord si disponible
      const guildLogger = client.discordLoggers?.get(interaction.guild.id);
      if (guildLogger && guildLogger.isInitialized()) {
        await guildLogger.logEvent("musique_queue", {
          user: interaction.user.tag,
          channel: voiceChannel.name
        });
      }
      logger.info(`File d'attente consultée par ${interaction.user.tag} dans ${voiceChannel.name}`);

    } catch (error) {
      logger.error("Erreur lors de l'affichage de la file d'attente", error);
      if (client.discordLoggers?.get(interaction.guild.id)) {
        await client.discordLoggers.get(interaction.guild.id).logError(error, { command: "queue", user: interaction.user.tag });
      }
      await interaction.reply({
        content: "❌ Une erreur est survenue lors de l'affichage de la file d'attente.",
        ephemeral: true
      });
    }
  },
};
