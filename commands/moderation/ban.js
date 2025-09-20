const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("../../utils/logger");
const embedConfig = require("../../utils/embedConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bannit un membre du serveur")
    .addUserOption(option =>
      option.setName("membre")
        .setDescription("Le membre à bannir")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("raison")
        .setDescription("Raison du bannissement")
        .setRequired(false)
        .setMaxLength(500)
    )
    .addIntegerOption(option =>
      option.setName("supprimer_messages")
        .setDescription("Nombre de jours de messages à supprimer (0-7)")
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction, client) {
    const member = interaction.options.getUser("membre");
    const reason = interaction.options.getString("raison") || "Aucune raison fournie";
    const deleteDays = interaction.options.getInteger("supprimer_messages") || 0;

    // Vérifications de permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ 
        content: "❌ Vous n'avez pas la permission de bannir des membres.", 
        ephemeral: true 
      });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ 
        content: "❌ Je n'ai pas la permission de bannir des membres.", 
        ephemeral: true 
      });
    }

    // Vérifier si l'utilisateur peut être banni
    const targetMember = interaction.guild.members.cache.get(member.id);
    if (targetMember) {
      if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({ 
          content: "❌ Vous ne pouvez pas bannir ce membre (rôle supérieur ou égal).", 
          ephemeral: true 
        });
      }

      if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({ 
          content: "❌ Je ne peux pas bannir ce membre (rôle supérieur ou égal).", 
          ephemeral: true 
        });
      }
    }

    // Empêcher l'auto-bannissement
    if (member.id === interaction.user.id) {
      return interaction.reply({ 
        content: "❌ Vous ne pouvez pas vous bannir vous-même !", 
        ephemeral: true 
      });
    }

    // Empêcher de bannir le bot
    if (member.id === client.user.id) {
      return interaction.reply({ 
        content: "❌ Je ne peux pas me bannir moi-même !", 
        ephemeral: true 
      });
    }

    try {
      await interaction.deferReply();

      // Bannir le membre
      await interaction.guild.members.ban(member, { 
        reason: reason,
        deleteMessageDays: deleteDays
      });

      // Embed de confirmation avec le nouveau système
      const banEmbed = embedConfig.createModerationEmbed(
        "Bannissement",
        member,
        interaction.user,
        reason,
        'moderation'
      )
      .setThumbnail(member.displayAvatarURL({ dynamic: true }))
      .addFields(
        { 
          name: "👤 Informations du membre", 
          value: `**Utilisateur:** ${member}\n**Tag:** \`${member.tag}\`\n**ID:** \`${member.id}\``, 
          inline: true 
        },
        { 
          name: "👮 Modérateur", 
          value: `**Modérateur:** ${interaction.user}\n**Tag:** \`${interaction.user.tag}\`\n**ID:** \`${interaction.user.id}\``, 
          inline: true 
        },
        { 
          name: "⚙️ Détails", 
          value: `**Messages supprimés:** \`${deleteDays} jour(s)\`\n**Serveur:** \`${interaction.guild.name}\`\n**Heure:** <t:${Math.floor(Date.now() / 1000)}:R>`, 
          inline: true 
        }
      );

      await interaction.editReply({ embeds: [banEmbed] });

      // Log de modération
      logger.info(`Membre banni: ${member.tag} par ${interaction.user.tag}`, {
        member: member.tag,
        moderator: interaction.user.tag,
        reason: reason,
        deleteDays: deleteDays,
        guild: interaction.guild.name
      });

      // Log Discord si disponible
      if (client.discordLogger && client.discordLogger.isInitialized()) {
        await client.discordLogger.logModeration("ban", interaction.user, member, reason, {
          deleteDays: deleteDays,
          guild: interaction.guild.name
        });
      }

      // Envoyer un MP au membre banni (si possible)
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle("🔨 Vous avez été banni")
          .setColor("#FF4444")
          .setDescription(`Vous avez été banni du serveur **${interaction.guild.name}**`)
          .addFields(
            { name: "📝 Raison", value: reason, inline: false },
            { name: "👮 Modérateur", value: interaction.user.tag, inline: true },
            { name: "📅 Date", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
          )
          .setFooter({ text: "Si vous pensez que c'est une erreur, contactez un administrateur" })
          .setTimestamp();

        await member.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        logger.warn(`Impossible d'envoyer un MP à ${member.tag}`, dmError);
      }

    } catch (error) {
      logger.error("Erreur lors du bannissement", error);
      
      const errorEmbed = embedConfig.createErrorEmbed(
        "Erreur lors du bannissement",
        `Une erreur est survenue lors du bannissement du membre.\n\n**Erreur:** \`${error.message}\``,
        'moderation'
      )
      .addFields(
        { 
          name: "🔧 Solutions possibles", 
          value: "• Vérifiez les permissions du bot\n• Vérifiez la hiérarchie des rôles\n• Contactez un administrateur", 
          inline: false 
        }
      );

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
