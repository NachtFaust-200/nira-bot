const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Débannit un utilisateur du serveur")
    .addStringOption(option =>
      option.setName("utilisateur")
        .setDescription("ID ou nom d'utilisateur de la personne à débannir")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("raison")
        .setDescription("Raison du débannissement")
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction, client) {
    const userInput = interaction.options.getString("utilisateur");
    const reason = interaction.options.getString("raison") || "Aucune raison spécifiée";

    // Vérifications des permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({
        content: "❌ Vous n'avez pas la permission de débannir des membres.",
        ephemeral: true
      });
    }

    try {
      // Essayer de récupérer l'utilisateur
      let user;
      try {
        // Si c'est un ID
        if (/^\d{17,19}$/.test(userInput)) {
          user = await client.users.fetch(userInput);
        } else {
          // Si c'est un nom d'utilisateur
          const bans = await interaction.guild.bans.fetch();
          user = bans.find(ban => ban.user.username === userInput)?.user;
        }
      } catch (error) {
        return interaction.reply({
          content: "❌ Utilisateur introuvable ou non banni.",
          ephemeral: true
        });
      }

      if (!user) {
        return interaction.reply({
          content: "❌ Utilisateur introuvable ou non banni.",
          ephemeral: true
        });
      }

      // Débannir l'utilisateur
      await interaction.guild.members.unban(user, reason);

      const embed = new EmbedBuilder()
        .setTitle("✅ Utilisateur débanni")
        .setDescription(`**${user.tag}** a été débanni du serveur.`)
        .setColor("#00FF00")
        .addFields(
          { name: "👤 Utilisateur", value: `${user.tag} (\`${user.id}\`)`, inline: true },
          { name: "🔨 Modérateur", value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
          { name: "📝 Raison", value: reason, inline: false }
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Débanni par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Log Discord si disponible
      const guildLogger = client.discordLoggers?.get(interaction.guild.id);
      if (guildLogger && guildLogger.isInitialized()) {
        await guildLogger.logMember("Utilisateur débanni", user, {
          moderator: interaction.user.tag,
          reason: reason,
          action: "unban"
        });
      }
      logger.info(`Utilisateur débanni: ${user.tag} par ${interaction.user.tag} pour ${reason}`);

    } catch (error) {
      logger.error("Erreur lors du débannissement", error);
      if (client.discordLoggers?.get(interaction.guild.id)) {
        await client.discordLoggers.get(interaction.guild.id).logError(error, { command: "unban", user: interaction.user.tag });
      }
      await interaction.reply({
        content: "❌ Une erreur est survenue lors du débannissement.",
        ephemeral: true
      });
    }
  },
};

