const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulse un membre du serveur")
    .addUserOption(option =>
      option.setName("membre")
        .setDescription("Le membre à expulser")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("raison")
        .setDescription("Raison de l'expulsion")
        .setRequired(false)
        .setMaxLength(500)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction, client) {
    const member = interaction.options.getUser("membre");
    const reason = interaction.options.getString("raison") || "Aucune raison fournie";

    // Vérifications de permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return interaction.reply({ 
        content: "❌ Vous n'avez pas la permission d'expulser des membres.", 
        ephemeral: true 
      });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
      return interaction.reply({ 
        content: "❌ Je n'ai pas la permission d'expulser des membres.", 
        ephemeral: true 
      });
    }

    // Vérifier si l'utilisateur peut être expulsé
    const targetMember = interaction.guild.members.cache.get(member.id);
    if (!targetMember) {
      return interaction.reply({ 
        content: "❌ Ce membre n'est pas sur le serveur.", 
        ephemeral: true 
      });
    }

    if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ 
        content: "❌ Vous ne pouvez pas expulser ce membre (rôle supérieur ou égal).", 
        ephemeral: true 
      });
    }

    if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ 
        content: "❌ Je ne peux pas expulser ce membre (rôle supérieur ou égal).", 
        ephemeral: true 
      });
    }

    // Empêcher l'auto-expulsion
    if (member.id === interaction.user.id) {
      return interaction.reply({ 
        content: "❌ Vous ne pouvez pas vous expulser vous-même !", 
        ephemeral: true 
      });
    }

    // Empêcher d'expulser le bot
    if (member.id === client.user.id) {
      return interaction.reply({ 
        content: "❌ Je ne peux pas m'expulser moi-même !", 
        ephemeral: true 
      });
    }

    try {
      await interaction.deferReply();

      // Expulser le membre
      await targetMember.kick(reason);

      // Embed de confirmation
      const kickEmbed = new EmbedBuilder()
        .setTitle("👢 Membre Expulsé")
        .setColor("#FFA500")
        .setThumbnail(member.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "👤 Membre", value: `${member} (\`${member.tag}\`)`, inline: true },
          { name: "👮 Modérateur", value: `${interaction.user}`, inline: true },
          { name: "📅 Date", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
          { name: "📝 Raison", value: reason, inline: false },
          { name: "🆔 ID", value: `\`${member.id}\``, inline: true }
        )
        .setFooter({ 
          text: `Expulsé par ${interaction.user.tag}`, 
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [kickEmbed] });

      // Log de modération
      logger.info(`Membre expulsé: ${member.tag} par ${interaction.user.tag}`, {
        member: member.tag,
        moderator: interaction.user.tag,
        reason: reason,
        guild: interaction.guild.name
      });

      // Log Discord si disponible
      if (client.discordLogger && client.discordLogger.isInitialized()) {
        await client.discordLogger.logModeration("kick", interaction.user, member, reason, {
          guild: interaction.guild.name
        });
      }

      // Envoyer un MP au membre expulsé (si possible)
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle("👢 Vous avez été expulsé")
          .setColor("#FFA500")
          .setDescription(`Vous avez été expulsé du serveur **${interaction.guild.name}**`)
          .addFields(
            { name: "📝 Raison", value: reason, inline: false },
            { name: "👮 Modérateur", value: interaction.user.tag, inline: true },
            { name: "📅 Date", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
          )
          .setFooter({ text: "Vous pouvez rejoindre le serveur si vous avez le lien d'invitation" })
          .setTimestamp();

        await member.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        logger.warn(`Impossible d'envoyer un MP à ${member.tag}`, dmError);
      }

    } catch (error) {
      logger.error("Erreur lors de l'expulsion", error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Erreur lors de l'expulsion")
        .setDescription("Une erreur est survenue lors de l'expulsion du membre.")
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
