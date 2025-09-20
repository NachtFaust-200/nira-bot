const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require("discord.js");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add")
    .setDescription("Ajoute une musique à la file d'attente")
    .addStringOption(option =>
      option.setName("musique")
        .setDescription("Nom de la musique, URL YouTube ou lien Spotify")
        .setRequired(true))
    .addChannelOption(option =>
      option.setName("salon")
        .setDescription("Salon vocal où jouer la musique")
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(false)),

  async execute(interaction, client) {
    const musicQuery = interaction.options.getString("musique");
    const voiceChannel = interaction.options.getChannel("salon") || interaction.member.voice.channel;

    // Vérifications
    if (!voiceChannel) {
      return interaction.reply({
        content: "❌ Vous devez être dans un salon vocal ou spécifier un salon.",
        ephemeral: true
      });
    }

    if (!interaction.member.voice.channel) {
      return interaction.reply({
        content: "❌ Vous devez être dans un salon vocal pour utiliser cette commande.",
        ephemeral: true
      });
    }

    if (voiceChannel.id !== interaction.member.voice.channel.id) {
      return interaction.reply({
        content: "❌ Vous devez être dans le même salon vocal que le bot.",
        ephemeral: true
      });
    }

    try {
      // Avec le système simplifié, on ne peut pas ajouter à une file d'attente
      // On redirige vers la commande play
      
      const embed = new EmbedBuilder()
        .setTitle("➕ Ajout de musique")
        .setDescription("Le système actuel ne supporte pas les files d'attente.\n\n**Utilisez `/play` pour jouer une musique directement.**")
        .setColor("#FFA500")
        .addFields(
          { name: "🎧 Salon", value: `${voiceChannel.name}`, inline: true },
          { name: "👤 Demandé par", value: `${interaction.user.tag}`, inline: true },
          { name: "ℹ️ Note", value: "Utilisez `/play musique:${musicQuery}` pour jouer cette musique", inline: false }
        )
        .setFooter({ text: "Musique chill - Ajout", iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Log Discord si disponible
      const guildLogger = client.discordLoggers?.get(interaction.guild.id);
      if (guildLogger && guildLogger.isInitialized()) {
        await guildLogger.logEvent("musique_add", {
          title: music.title,
          user: interaction.user.tag,
          channel: voiceChannel.name,
          position: queuePosition,
          type: linkType
        });
      }
      logger.info(`Musique ajoutée: ${music.title} (${linkType}) par ${interaction.user.tag} dans ${voiceChannel.name} - Position #${queuePosition}`);

    } catch (error) {
      logger.error("Erreur lors de l'ajout de la musique", error);
      if (client.discordLoggers?.get(interaction.guild.id)) {
        await client.discordLoggers.get(interaction.guild.id).logError(error, { command: "add", user: interaction.user.tag });
      }
      await interaction.editReply({
        content: "❌ Une erreur est survenue lors de l'ajout de la musique.",
        ephemeral: true
      });
    }
  },
};
