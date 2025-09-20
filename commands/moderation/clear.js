const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Supprime un nombre de messages dans le salon")
    .addIntegerOption(option =>
      option.setName("nombre")
        .setDescription("Nombre de messages à supprimer (1-100)")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true))
    .addUserOption(option =>
      option.setName("utilisateur")
        .setDescription("Supprimer seulement les messages de cet utilisateur")
        .setRequired(false))
    .addStringOption(option =>
      option.setName("raison")
        .setDescription("Raison de la suppression")
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction, client) {
    const amount = interaction.options.getInteger("nombre");
    const targetUser = interaction.options.getUser("utilisateur");
    const reason = interaction.options.getString("raison") || "Aucune raison spécifiée";

    // Vérifications des permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: "❌ Vous n'avez pas la permission de supprimer des messages.",
        ephemeral: true
      });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: "❌ Je n'ai pas la permission de supprimer des messages.",
        ephemeral: true
      });
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      let deletedCount = 0;
      let lastMessage = null;

      // Récupérer les messages
      const messages = await interaction.channel.messages.fetch({ limit: amount });
      
      // Filtrer par utilisateur si spécifié
      const messagesToDelete = targetUser 
        ? messages.filter(msg => msg.author.id === targetUser.id)
        : messages;

      // Supprimer les messages
      if (messagesToDelete.size > 0) {
        const deleted = await interaction.channel.bulkDelete(messagesToDelete, true);
        deletedCount = deleted.size;
        lastMessage = deleted.first();
      }

      const embed = new EmbedBuilder()
        .setTitle("✅ Messages supprimés")
        .setDescription(`**${deletedCount}** message(s) supprimé(s) avec succès.`)
        .setColor("#00FF00")
        .addFields(
          { name: "🔢 Nombre", value: `${deletedCount}`, inline: true },
          { name: "👤 Modérateur", value: `${interaction.user.tag}`, inline: true },
          { name: "📝 Raison", value: reason, inline: false }
        )
        .setTimestamp();

      if (targetUser) {
        embed.addFields({ name: "🎯 Utilisateur ciblé", value: `${targetUser.tag}`, inline: true });
      }

      await interaction.editReply({ embeds: [embed] });

      // Log Discord si disponible
      const guildLogger = client.discordLoggers?.get(interaction.guild.id);
      if (guildLogger && guildLogger.isInitialized()) {
        await guildLogger.logMember("Messages supprimés", interaction.user, {
          moderator: interaction.user.tag,
          reason: reason,
          count: deletedCount,
          targetUser: targetUser?.tag,
          channel: interaction.channel.name,
          action: "clear"
        });
      }
      logger.info(`Messages supprimés: ${deletedCount} par ${interaction.user.tag} dans ${interaction.channel.name}`);

    } catch (error) {
      logger.error("Erreur lors de la suppression des messages", error);
      if (client.discordLoggers?.get(interaction.guild.id)) {
        await client.discordLoggers.get(interaction.guild.id).logError(error, { command: "clear", user: interaction.user.tag });
      }
      await interaction.editReply({
        content: "❌ Une erreur est survenue lors de la suppression des messages.",
        ephemeral: true
      });
    }
  },
};

