const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("../../utils/logger");
const fs = require("fs");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("Affiche les avertissements d'un membre")
    .addUserOption(option =>
      option.setName("membre")
        .setDescription("Le membre dont afficher les avertissements")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const member = interaction.options.getUser("membre");

    // Vérifications de permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ 
        content: "❌ Vous n'avez pas la permission de voir les avertissements.", 
        ephemeral: true 
      });
    }

    try {
      await interaction.deferReply();

      // Charger les warnings
      const warningsPath = path.join(__dirname, "../../data/warnings.json");
      let warnings = {};
      
      if (fs.existsSync(warningsPath)) {
        warnings = JSON.parse(fs.readFileSync(warningsPath, "utf8"));
      }

      // Récupérer les warnings du membre
      const memberWarnings = warnings[interaction.guild.id]?.[member.id] || [];

      if (memberWarnings.length === 0) {
        const noWarningsEmbed = new EmbedBuilder()
          .setTitle("✅ Aucun Avertissement")
          .setDescription(`${member} n'a aucun avertissement sur ce serveur.`)
          .setColor("#00FF00")
          .setThumbnail(member.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: "👤 Membre", value: `${member} (\`${member.tag}\`)`, inline: true },
            { name: "⚠️ Total", value: "0", inline: true },
            { name: "📅 Dernière vérification", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
          )
          .setFooter({ text: "Aucun avertissement trouvé • Nira Bot" })
          .setTimestamp();

        return interaction.editReply({ embeds: [noWarningsEmbed] });
      }

      // Créer l'embed avec les warnings
      const warningsEmbed = new EmbedBuilder()
        .setTitle(`⚠️ Avertissements de ${member.tag}`)
        .setColor("#FFA500")
        .setThumbnail(member.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "👤 Membre", value: `${member} (\`${member.tag}\`)`, inline: true },
          { name: "⚠️ Total", value: `${memberWarnings.length}`, inline: true },
          { name: "📅 Dernière vérification", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setFooter({ text: `Avertissements de ${member.tag} • Nira Bot` })
        .setTimestamp();

      // Ajouter les warnings (maximum 10 pour éviter la limite Discord)
      const displayWarnings = memberWarnings.slice(-10).reverse();
      
      for (let i = 0; i < displayWarnings.length; i++) {
        const warning = displayWarnings[i];
        const date = new Date(warning.date);
        
        warningsEmbed.addFields({
          name: `⚠️ Avertissement #${memberWarnings.length - i}`,
          value: `**Raison:** ${warning.reason}\n**Modérateur:** ${warning.moderatorTag}\n**Date:** <t:${Math.floor(date.getTime() / 1000)}:R>`,
          inline: false
        });
      }

      // Ajouter une note si il y a plus de 10 warnings
      if (memberWarnings.length > 10) {
        warningsEmbed.addFields({
          name: "📝 Note",
          value: `Affiche les 10 derniers avertissements sur ${memberWarnings.length} au total.`,
          inline: false
        });
      }

      await interaction.editReply({ embeds: [warningsEmbed] });

      // Log de consultation
      logger.info(`Consultation des warnings: ${member.tag} par ${interaction.user.tag}`, {
        member: member.tag,
        moderator: interaction.user.tag,
        warningCount: memberWarnings.length,
        guild: interaction.guild.name
      });

    } catch (error) {
      logger.error("Erreur lors de la consultation des warnings", error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Erreur lors de la consultation")
        .setDescription("Une erreur est survenue lors de la consultation des avertissements.")
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
