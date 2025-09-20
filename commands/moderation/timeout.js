const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Met un membre en timeout temporaire")
    .addUserOption(option =>
      option.setName("membre")
        .setDescription("Le membre à mettre en timeout")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("duree")
        .setDescription("Durée du timeout (ex: 10m, 1h, 1d, 1w). Maximum 28 jours.")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("raison")
        .setDescription("Raison du timeout")
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const member = interaction.options.getMember("membre");
    const durationString = interaction.options.getString("duree");
    const reason = interaction.options.getString("raison") || "Aucune raison spécifiée";

    // Vérifications des permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({
        content: "❌ Vous n'avez pas la permission de mettre en timeout des membres.",
        ephemeral: true
      });
    }

    if (!member) {
      return interaction.reply({
        content: "❌ Ce membre n'est pas sur le serveur ou n'existe pas.",
        ephemeral: true
      });
    }

    if (member.id === interaction.user.id) {
      return interaction.reply({
        content: "❌ Vous ne pouvez pas vous mettre en timeout vous-même.",
        ephemeral: true
      });
    }

    if (member.id === client.user.id) {
      return interaction.reply({
        content: "❌ Je ne peux pas me mettre en timeout moi-même.",
        ephemeral: true
      });
    }

    if (member.permissions.has(PermissionFlagsBits.Administrator) || member.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({
        content: "❌ Vous ne pouvez pas mettre en timeout ce membre car il a un rôle égal ou supérieur au vôtre, ou est administrateur.",
        ephemeral: true
      });
    }

    if (!member.moderatable) {
      return interaction.reply({
        content: "❌ Je ne peux pas mettre en timeout ce membre. Vérifiez mes permissions et la hiérarchie des rôles.",
        ephemeral: true
      });
    }

    // Parser la durée
    const ms = require("ms");
    const duration = ms(durationString);
    
    if (!duration || duration < 1000 * 60) { // Minimum 1 minute
      return interaction.reply({
        content: "❌ Durée invalide. Utilisez des formats comme `10m`, `1h`, `1d`, `1w` (minimum 1 minute).",
        ephemeral: true
      });
    }

    if (duration > 28 * 24 * 60 * 60 * 1000) { // Maximum 28 jours
      return interaction.reply({
        content: "❌ Durée trop longue. Le maximum est de 28 jours.",
        ephemeral: true
      });
    }

    try {
      await member.timeout(duration, reason);

      const embed = new EmbedBuilder()
        .setTitle("⏰ Membre en timeout")
        .setDescription(`**${member.user.tag}** a été mis en timeout.`)
        .setColor("#FFA500")
        .addFields(
          { name: "👤 Membre", value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
          { name: "🔨 Modérateur", value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
          { name: "⏰ Durée", value: durationString, inline: true },
          { name: "📝 Raison", value: reason, inline: false }
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Timeout par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Log Discord si disponible
      const guildLogger = client.discordLoggers?.get(interaction.guild.id);
      if (guildLogger && guildLogger.isInitialized()) {
        await guildLogger.logMember("Membre en timeout", member.user, {
          moderator: interaction.user.tag,
          reason: reason,
          duration: durationString,
          action: "timeout"
        });
      }
      logger.info(`Membre en timeout: ${member.user.tag} par ${interaction.user.tag} pour ${reason} (${durationString})`);

    } catch (error) {
      logger.error("Erreur lors du timeout du membre", error);
      if (client.discordLoggers?.get(interaction.guild.id)) {
        await client.discordLoggers.get(interaction.guild.id).logError(error, { command: "timeout", user: interaction.user.tag, target: member.user.tag });
      }
      await interaction.reply({
        content: "❌ Une erreur est survenue lors du timeout du membre.",
        ephemeral: true
      });
    }
  },
};

