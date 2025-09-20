const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Rend muet un membre temporairement ou définitivement")
    .addUserOption(option =>
      option.setName("membre")
        .setDescription("Le membre à rendre muet")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("raison")
        .setDescription("Raison du mute")
        .setRequired(false)
        .setMaxLength(500)
    )
    .addStringOption(option =>
      option.setName("duree")
        .setDescription("Durée du mute (ex: 1h, 30m, 1d)")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const member = interaction.options.getUser("membre");
    const reason = interaction.options.getString("raison") || "Aucune raison fournie";
    const duration = interaction.options.getString("duree");

    // Vérifications de permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ 
        content: "❌ Vous n'avez pas la permission de rendre muet des membres.", 
        ephemeral: true 
      });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ 
        content: "❌ Je n'ai pas la permission de rendre muet des membres.", 
        ephemeral: true 
      });
    }

    // Vérifier si l'utilisateur peut être rendu muet
    const targetMember = interaction.guild.members.cache.get(member.id);
    if (!targetMember) {
      return interaction.reply({ 
        content: "❌ Ce membre n'est pas sur le serveur.", 
        ephemeral: true 
      });
    }

    if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ 
        content: "❌ Vous ne pouvez pas rendre muet ce membre (rôle supérieur ou égal).", 
        ephemeral: true 
      });
    }

    if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ 
        content: "❌ Je ne peux pas rendre muet ce membre (rôle supérieur ou égal).", 
        ephemeral: true 
      });
    }

    // Empêcher l'auto-mute
    if (member.id === interaction.user.id) {
      return interaction.reply({ 
        content: "❌ Vous ne pouvez pas vous rendre muet vous-même !", 
        ephemeral: true 
      });
    }

    // Empêcher de rendre muet le bot
    if (member.id === client.user.id) {
      return interaction.reply({ 
        content: "❌ Je ne peux pas me rendre muet moi-même !", 
        ephemeral: true 
      });
    }

    try {
      await interaction.deferReply();

      // Calculer la durée en millisecondes
      let timeoutDuration = null;
      let durationText = "Permanent";
      
      if (duration) {
        const timeMatch = duration.match(/^(\d+)([smhd])$/);
        if (!timeMatch) {
          return interaction.editReply({ 
            content: "❌ Format de durée invalide. Utilisez: `1s`, `5m`, `1h`, `1d`", 
            ephemeral: true 
          });
        }

        const value = parseInt(timeMatch[1]);
        const unit = timeMatch[2];
        
        switch (unit) {
          case 's':
            timeoutDuration = value * 1000;
            durationText = `${value} seconde(s)`;
            break;
          case 'm':
            timeoutDuration = value * 60 * 1000;
            durationText = `${value} minute(s)`;
            break;
          case 'h':
            timeoutDuration = value * 60 * 60 * 1000;
            durationText = `${value} heure(s)`;
            break;
          case 'd':
            timeoutDuration = value * 24 * 60 * 60 * 1000;
            durationText = `${value} jour(s)`;
            break;
        }

        // Limite de 28 jours (limite Discord)
        if (timeoutDuration > 28 * 24 * 60 * 60 * 1000) {
          return interaction.editReply({ 
            content: "❌ La durée maximale est de 28 jours.", 
            ephemeral: true 
          });
        }
      }

      // Rendre muet le membre
      await targetMember.timeout(timeoutDuration, reason);

      // Embed de confirmation
      const muteEmbed = new EmbedBuilder()
        .setTitle("🔇 Membre Rendu Muet")
        .setColor("#FFA500")
        .setThumbnail(member.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "👤 Membre", value: `${member} (\`${member.tag}\`)`, inline: true },
          { name: "👮 Modérateur", value: `${interaction.user}`, inline: true },
          { name: "📅 Date", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
          { name: "📝 Raison", value: reason, inline: false },
          { name: "⏰ Durée", value: durationText, inline: true },
          { name: "🆔 ID", value: `\`${member.id}\``, inline: true }
        )
        .setFooter({ 
          text: `Rendu muet par ${interaction.user.tag}`, 
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [muteEmbed] });

      // Log de modération
      logger.info(`Membre rendu muet: ${member.tag} par ${interaction.user.tag}`, {
        member: member.tag,
        moderator: interaction.user.tag,
        reason: reason,
        duration: durationText,
        guild: interaction.guild.name
      });

      // Log Discord si disponible
      if (client.discordLogger && client.discordLogger.isInitialized()) {
        await client.discordLogger.logModeration("mute", interaction.user, member, reason, {
          duration: durationText,
          guild: interaction.guild.name
        });
      }

      // Envoyer un MP au membre rendu muet (si possible)
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle("🔇 Vous avez été rendu muet")
          .setColor("#FFA500")
          .setDescription(`Vous avez été rendu muet sur le serveur **${interaction.guild.name}**`)
          .addFields(
            { name: "📝 Raison", value: reason, inline: false },
            { name: "👮 Modérateur", value: interaction.user.tag, inline: true },
            { name: "⏰ Durée", value: durationText, inline: true },
            { name: "📅 Date", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
          )
          .setFooter({ text: "Contactez un modérateur si vous pensez que c'est une erreur" })
          .setTimestamp();

        await member.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        logger.warn(`Impossible d'envoyer un MP à ${member.tag}`, dmError);
      }

    } catch (error) {
      logger.error("Erreur lors du mute", error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Erreur lors du mute")
        .setDescription("Une erreur est survenue lors du mute du membre.")
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
