const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Ajuste le volume de la musique")
    .addIntegerOption(option =>
      option.setName("niveau")
        .setDescription("Niveau de volume (0-100)")
        .setMinValue(0)
        .setMaxValue(100)
        .setRequired(true)),

  async execute(interaction, client) {
    const volume = interaction.options.getInteger("niveau");
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
      // Ajuster le volume (pour l'instant, on ne peut pas ajuster le volume avec @discordjs/voice)
      // Cette fonctionnalité nécessiterait une implémentation plus complexe
      
      const embed = new EmbedBuilder()
        .setTitle("🔊 Volume")
        .setDescription(`Le volume ne peut pas être ajusté avec le système actuel.`)
        .setColor("#9B59B6")
        .addFields(
          { name: "🎧 Salon", value: `${voiceChannel.name}`, inline: true },
          { name: "👤 Demandé par", value: `${interaction.user.tag}`, inline: true },
          { name: "ℹ️ Note", value: "Le volume est fixé à 100%", inline: false }
        )
        .setFooter({ text: "Volume de la musique chill", iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Log Discord si disponible
      const guildLogger = client.discordLoggers?.get(interaction.guild.id);
      if (guildLogger && guildLogger.isInitialized()) {
        await guildLogger.logEvent("musique_volume", {
          volume: volume,
          user: interaction.user.tag,
          channel: voiceChannel.name
        });
      }
      logger.info(`Volume ajusté à ${volume}% par ${interaction.user.tag} dans ${voiceChannel.name}`);

    } catch (error) {
      logger.error("Erreur lors de l'ajustement du volume", error);
      if (client.discordLoggers?.get(interaction.guild.id)) {
        await client.discordLoggers.get(interaction.guild.id).logError(error, { command: "volume", user: interaction.user.tag });
      }
      await interaction.reply({
        content: "❌ Une erreur est survenue lors de l'ajustement du volume.",
        ephemeral: true
      });
    }
  },
};
