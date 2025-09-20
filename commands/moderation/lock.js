const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Verrouille ou déverrouille un salon")
    .addSubcommand(subcommand =>
      subcommand
        .setName("on")
        .setDescription("Verrouille le salon")
        .addChannelOption(option =>
          option.setName("salon")
            .setDescription("Salon à verrouiller (défaut: salon actuel)")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
            .setRequired(false))
        .addStringOption(option =>
          option.setName("raison")
            .setDescription("Raison du verrouillage")
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("off")
        .setDescription("Déverrouille le salon")
        .addChannelOption(option =>
          option.setName("salon")
            .setDescription("Salon à déverrouiller (défaut: salon actuel)")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
            .setRequired(false))
        .addStringOption(option =>
          option.setName("raison")
            .setDescription("Raison du déverrouillage")
            .setRequired(false)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
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
      if (subcommand === "on") {
        // Verrouiller le salon
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          SendMessages: false,
          AddReactions: false
        });

        const embed = new EmbedBuilder()
          .setTitle("🔒 Salon verrouillé")
          .setDescription(`**${channel.name}** a été verrouillé.`)
          .setColor("#FF4444")
          .addFields(
            { name: "📺 Salon", value: `${channel}`, inline: true },
            { name: "🔨 Modérateur", value: `${interaction.user.tag}`, inline: true },
            { name: "📝 Raison", value: reason, inline: false }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Log Discord si disponible
        const guildLogger = client.discordLoggers?.get(interaction.guild.id);
        if (guildLogger && guildLogger.isInitialized()) {
          await guildLogger.logMember("Salon verrouillé", interaction.user, {
            moderator: interaction.user.tag,
            reason: reason,
            channel: channel.name,
            action: "lock_on"
          });
        }
        logger.info(`Salon verrouillé: ${channel.name} par ${interaction.user.tag}`);

      } else if (subcommand === "off") {
        // Déverrouiller le salon
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          SendMessages: null,
          AddReactions: null
        });

        const embed = new EmbedBuilder()
          .setTitle("🔓 Salon déverrouillé")
          .setDescription(`**${channel.name}** a été déverrouillé.`)
          .setColor("#00FF00")
          .addFields(
            { name: "📺 Salon", value: `${channel}`, inline: true },
            { name: "🔨 Modérateur", value: `${interaction.user.tag}`, inline: true },
            { name: "📝 Raison", value: reason, inline: false }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Log Discord si disponible
        const guildLogger = client.discordLoggers?.get(interaction.guild.id);
        if (guildLogger && guildLogger.isInitialized()) {
          await guildLogger.logMember("Salon déverrouillé", interaction.user, {
            moderator: interaction.user.tag,
            reason: reason,
            channel: channel.name,
            action: "lock_off"
          });
        }
        logger.info(`Salon déverrouillé: ${channel.name} par ${interaction.user.tag}`);
      }

    } catch (error) {
      logger.error("Erreur lors du verrouillage/déverrouillage", error);
      if (client.discordLoggers?.get(interaction.guild.id)) {
        await client.discordLoggers.get(interaction.guild.id).logError(error, { command: "lock", user: interaction.user.tag });
      }
      await interaction.reply({
        content: "❌ Une erreur est survenue lors de l'opération.",
        ephemeral: true
      });
    }
  },
};

