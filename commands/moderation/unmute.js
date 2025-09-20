const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Enlève le mute d'un membre")
    .addUserOption(option =>
      option.setName("membre")
        .setDescription("Le membre à unmute")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("raison")
        .setDescription("Raison de l'unmute")
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const member = interaction.options.getMember("membre");
    const reason = interaction.options.getString("raison") || "Aucune raison spécifiée";

    // Vérifications des permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({
        content: "❌ Vous n'avez pas la permission de unmute des membres.",
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
        content: "❌ Vous ne pouvez pas vous unmute vous-même.",
        ephemeral: true
      });
    }

    if (member.id === client.user.id) {
      return interaction.reply({
        content: "❌ Je ne peux pas me unmute moi-même.",
        ephemeral: true
      });
    }

    if (member.permissions.has(PermissionFlagsBits.Administrator) || member.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({
        content: "❌ Vous ne pouvez pas unmute ce membre car il a un rôle égal ou supérieur au vôtre, ou est administrateur.",
        ephemeral: true
      });
    }

    if (!member.moderatable) {
      return interaction.reply({
        content: "❌ Je ne peux pas unmute ce membre. Vérifiez mes permissions et la hiérarchie des rôles.",
        ephemeral: true
      });
    }

    try {
      // Vérifier si le membre est vraiment en timeout
      if (!member.isCommunicationDisabled()) {
        return interaction.reply({
          content: "❌ Ce membre n'est pas en timeout.",
          ephemeral: true
        });
      }

      await member.timeout(null, reason);

      const embed = new EmbedBuilder()
        .setTitle("✅ Membre unmute")
        .setDescription(`**${member.user.tag}** n'est plus en timeout.`)
        .setColor("#00FF00")
        .addFields(
          { name: "👤 Membre", value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
          { name: "🔨 Modérateur", value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
          { name: "📝 Raison", value: reason, inline: false }
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Unmute par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Log Discord si disponible
      const guildLogger = client.discordLoggers?.get(interaction.guild.id);
      if (guildLogger && guildLogger.isInitialized()) {
        await guildLogger.logMember("Membre unmute", member.user, {
          moderator: interaction.user.tag,
          reason: reason,
          action: "unmute"
        });
      }
      logger.info(`Membre unmute: ${member.user.tag} par ${interaction.user.tag} pour ${reason}`);

    } catch (error) {
      logger.error("Erreur lors de l'unmute du membre", error);
      if (client.discordLoggers?.get(interaction.guild.id)) {
        await client.discordLoggers.get(interaction.guild.id).logError(error, { command: "unmute", user: interaction.user.tag, target: member.user.tag });
      }
      await interaction.reply({
        content: "❌ Une erreur est survenue lors de l'unmute du membre.",
        ephemeral: true
      });
    }
  },
};

