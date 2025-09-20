const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("../../utils/logger");
const fs = require("fs");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Avertit un membre du serveur")
    .addUserOption(option =>
      option.setName("membre")
        .setDescription("Le membre à avertir")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("raison")
        .setDescription("Raison de l'avertissement")
        .setRequired(true)
        .setMaxLength(500)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const member = interaction.options.getUser("membre");
    const reason = interaction.options.getString("raison");

    // Vérifications de permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ 
        content: "❌ Vous n'avez pas la permission d'avertir des membres.", 
        ephemeral: true 
      });
    }

    // Vérifier si l'utilisateur peut être averti
    const targetMember = interaction.guild.members.cache.get(member.id);
    if (!targetMember) {
      return interaction.reply({ 
        content: "❌ Ce membre n'est pas sur le serveur.", 
        ephemeral: true 
      });
    }

    if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ 
        content: "❌ Vous ne pouvez pas avertir ce membre (rôle supérieur ou égal).", 
        ephemeral: true 
      });
    }

    // Empêcher l'auto-avertissement
    if (member.id === interaction.user.id) {
      return interaction.reply({ 
        content: "❌ Vous ne pouvez pas vous avertir vous-même !", 
        ephemeral: true 
      });
    }

    // Empêcher d'avertir le bot
    if (member.id === client.user.id) {
      return interaction.reply({ 
        content: "❌ Je ne peux pas m'avertir moi-même !", 
        ephemeral: true 
      });
    }

    try {
      await interaction.deferReply();

      // Charger ou créer le fichier de warnings
      const warningsPath = path.join(__dirname, "../../data/warnings.json");
      let warnings = {};
      
      if (fs.existsSync(warningsPath)) {
        warnings = JSON.parse(fs.readFileSync(warningsPath, "utf8"));
      }

      // Initialiser les warnings pour ce serveur
      if (!warnings[interaction.guild.id]) {
        warnings[interaction.guild.id] = {};
      }

      // Initialiser les warnings pour ce membre
      if (!warnings[interaction.guild.id][member.id]) {
        warnings[interaction.guild.id][member.id] = [];
      }

      // Ajouter le warning
      const warning = {
        id: Date.now(),
        reason: reason,
        moderator: interaction.user.id,
        moderatorTag: interaction.user.tag,
        date: new Date().toISOString(),
        guild: interaction.guild.id
      };

      warnings[interaction.guild.id][member.id].push(warning);

      // Sauvegarder les warnings
      fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));

      // Compter les warnings
      const warningCount = warnings[interaction.guild.id][member.id].length;

      // Embed de confirmation
      const warnEmbed = new EmbedBuilder()
        .setTitle("⚠️ Membre Averti")
        .setColor("#FFA500")
        .setThumbnail(member.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "👤 Membre", value: `${member} (\`${member.tag}\`)`, inline: true },
          { name: "👮 Modérateur", value: `${interaction.user}`, inline: true },
          { name: "📅 Date", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
          { name: "📝 Raison", value: reason, inline: false },
          { name: "⚠️ Total d'avertissements", value: `${warningCount}`, inline: true },
          { name: "🆔 ID", value: `\`${member.id}\``, inline: true }
        )
        .setFooter({ 
          text: `Averti par ${interaction.user.tag}`, 
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [warnEmbed] });

      // Log de modération
      logger.info(`Membre averti: ${member.tag} par ${interaction.user.tag}`, {
        member: member.tag,
        moderator: interaction.user.tag,
        reason: reason,
        warningCount: warningCount,
        guild: interaction.guild.name
      });

      // Log Discord si disponible
      if (client.discordLogger && client.discordLogger.isInitialized()) {
        await client.discordLogger.logModeration("warn", interaction.user, member, reason, {
          warningCount: warningCount,
          guild: interaction.guild.name
        });
      }

      // Envoyer un MP au membre averti (si possible)
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle("⚠️ Vous avez reçu un avertissement")
          .setColor("#FFA500")
          .setDescription(`Vous avez reçu un avertissement sur le serveur **${interaction.guild.name}**`)
          .addFields(
            { name: "📝 Raison", value: reason, inline: false },
            { name: "👮 Modérateur", value: interaction.user.tag, inline: true },
            { name: "⚠️ Total d'avertissements", value: `${warningCount}`, inline: true },
            { name: "📅 Date", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
          )
          .setFooter({ text: "Évitez de répéter ce comportement pour éviter des sanctions plus sévères" })
          .setTimestamp();

        await member.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        logger.warn(`Impossible d'envoyer un MP à ${member.tag}`, dmError);
      }

    } catch (error) {
      logger.error("Erreur lors de l'avertissement", error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Erreur lors de l'avertissement")
        .setDescription("Une erreur est survenue lors de l'avertissement du membre.")
        .setColor("#FF0000")
        .addFields(
          { name: "🚨 Erreur", value: `\`${error.message}\``, inline: false }
        )
        .setFooter({ text: "Erreur de modération • Nira Bot" })
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
