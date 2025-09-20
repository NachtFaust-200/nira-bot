const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("Configure le mode lent d'un salon")
    .addIntegerOption(option =>
      option.setName("secondes")
        .setDescription("Délai en secondes (0-21600, 0 pour désactiver)")
        .setMinValue(0)
        .setMaxValue(21600)
        .setRequired(true))
    .addChannelOption(option =>
      option.setName("salon")
        .setDescription("Salon à modifier (défaut: salon actuel)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false))
    .addStringOption(option =>
      option.setName("raison")
        .setDescription("Raison du changement")
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction, client) {
    const seconds = interaction.options.getInteger("secondes");
    const channel = interaction.options.getChannel("salon") || interaction.channel;
    const reason = interaction.options.getString("raison") || "Aucune raison spécifiée";

    // Vérifications des permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({
        content: "❌ Vous n'avez pas la permission de gérer les salons.",
        ephemeral: true
      });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({
        content: "❌ Je n'ai pas la permission de gérer les salons.",
        ephemeral: true
      });
    }

    try {
      // Appliquer le mode lent
      await channel.setRateLimitPerUser(seconds);

      const embed = new EmbedBuilder()
        .setTitle("⏱️ Mode lent configuré")
        .setDescription(`Le mode lent de **${channel.name}** a été configuré.`)
        .setColor(seconds > 0 ? "#FFA500" : "#00FF00")
        .addFields(
          { name: "📺 Salon", value: `${channel}`, inline: true },
          { name: "⏰ Délai", value: seconds > 0 ? `${seconds} seconde(s)` : "Désactivé", inline: true },
          { name: "🔨 Modérateur", value: `${interaction.user.tag}`, inline: true },
          { name: "📝 Raison", value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Log Discord si disponible
      const guildLogger = client.discordLoggers?.get(interaction.guild.id);
      if (guildLogger && guildLogger.isInitialized()) {
        await guildLogger.logMember("Mode lent configuré", interaction.user, {
          moderator: interaction.user.tag,
          reason: reason,
          channel: channel.name,
          seconds: seconds,
          action: "slowmode"
        });
      }
      logger.info(`Mode lent configuré: ${channel.name} à ${seconds}s par ${interaction.user.tag}`);

    } catch (error) {
      logger.error("Erreur lors de la configuration du mode lent", error);
      if (client.discordLoggers?.get(interaction.guild.id)) {
        await client.discordLoggers.get(interaction.guild.id).logError(error, { command: "slowmode", user: interaction.user.tag });
      }
      await interaction.reply({
        content: "❌ Une erreur est survenue lors de la configuration du mode lent.",
        ephemeral: true
      });
    }
  },
};

