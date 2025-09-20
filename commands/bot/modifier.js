const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, StringSelectMenuBuilder, ActivityType } = require("discord.js");
const embedConfig = require("../../utils/embedConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("modifier")
    .setDescription("Modifier le statut, l'avatar et la bannière du bot")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName("statut")
        .setDescription("Modifier le statut du bot")
        .addStringOption(option =>
          option.setName("type")
            .setDescription("Type de statut")
            .setRequired(true)
            .addChoices(
              { name: "🟢 En ligne", value: "online" },
              { name: "🟡 Occupé", value: "dnd" },
              { name: "🟠 Absent", value: "idle" },
              { name: "⚫ Hors ligne", value: "invisible" }
            )
        )
        .addStringOption(option =>
          option.setName("activite")
            .setDescription("Type d'activité")
            .setRequired(false)
            .addChoices(
              { name: "🎮 Joue à", value: "playing" },
              { name: "📺 Regarde", value: "watching" },
              { name: "🎵 Écoute", value: "listening" },
              { name: "💬 Stream", value: "streaming" }
            )
        )
        .addStringOption(option =>
          option.setName("texte")
            .setDescription("Texte de l'activité")
            .setRequired(false)
            .setMaxLength(128)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("avatar")
        .setDescription("Modifier l'avatar du bot")
        .addAttachmentOption(option =>
          option.setName("image")
            .setDescription("Image d'avatar à télécharger depuis votre PC")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("banniere")
        .setDescription("Modifier la bannière du bot")
        .addAttachmentOption(option =>
          option.setName("image")
            .setDescription("Image de bannière à télécharger depuis votre PC")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("avatar-url")
        .setDescription("Modifier l'avatar du bot via URL")
        .addStringOption(option =>
          option.setName("url")
            .setDescription("URL de la nouvelle image d'avatar")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("banniere-url")
        .setDescription("Modifier la bannière du bot via URL")
        .addStringOption(option =>
          option.setName("url")
            .setDescription("URL de la nouvelle bannière")
            .setRequired(true)
        )
    ),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    try {
      await interaction.deferReply({ ephemeral: false }); // Rendre visible pour tous

      if (subcommand === "statut") {
        const statusType = interaction.options.getString("type");
        const activityType = interaction.options.getString("activite");
        const activityText = interaction.options.getString("texte");

        // Configuration du statut
        const statusConfig = {
          online: { name: "En ligne", emoji: "🟢" },
          dnd: { name: "Occupé", emoji: "🔴" },
          idle: { name: "Absent", emoji: "🟡" },
          invisible: { name: "Hors ligne", emoji: "⚫" }
        };

        // Configuration de l'activité
        const activityConfig = {
          playing: { name: "Joue à", type: ActivityType.Playing },
          watching: { name: "Regarde", type: ActivityType.Watching },
          listening: { name: "Écoute", type: ActivityType.Listening },
          streaming: { name: "Stream", type: ActivityType.Streaming }
        };

        // Mettre à jour le statut - correction pour DND
        const presenceData = {
          status: statusType,
          activities: activityType && activityText ? [{
            name: activityText,
            type: activityConfig[activityType].type
          }] : []
        };

        // Utiliser setPresence avec les bonnes options
        await client.user.setPresence(presenceData);

        const embed = embedConfig.createSuccessEmbed(
          "Statut modifié avec succès !",
          `**Nouveau statut :** ${statusConfig[statusType].emoji} ${statusConfig[statusType].name}\n${activityType && activityText ? `**Activité :** ${activityConfig[activityType].name} ${activityText}` : ""}`,
          'bot'
        )
        .addFields(
          { 
            name: "📊 Informations", 
            value: `**Statut:** \`${statusConfig[statusType].name}\`\n**Activité:** \`${activityType ? activityConfig[activityType].name : 'Aucune'}\`\n**Texte:** \`${activityText || 'Aucun'}\``, 
            inline: true 
          },
          { 
            name: "⏰ Heure", 
            value: `<t:${Math.floor(Date.now() / 1000)}:F>`, 
            inline: true 
          }
        );

        await interaction.editReply({ embeds: [embed] });

      } else if (subcommand === "avatar") {
        const attachment = interaction.options.getAttachment("image");

        // Vérifier que c'est une image
        if (!attachment.contentType.startsWith('image/')) {
          const errorEmbed = embedConfig.createErrorEmbed(
            "Fichier invalide",
            "Le fichier doit être une image (jpg, jpeg, png, gif, webp).",
            'bot'
          );
          return interaction.editReply({ embeds: [errorEmbed] });
        }

        try {
          await client.user.setAvatar(attachment.url);

          const embed = embedConfig.createSuccessEmbed(
            "Avatar modifié avec succès !",
            `**Nouvel avatar :** [Voir l'image](${attachment.url})`,
            'bot'
          )
          .setThumbnail(attachment.url)
          .addFields(
            { 
              name: "📊 Informations", 
              value: `**Nom:** \`${attachment.name}\`\n**Format:** \`${attachment.contentType}\`\n**Taille:** \`${(attachment.size / 1024).toFixed(1)}KB\``, 
              inline: true 
            },
            { 
              name: "⏰ Heure", 
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`, 
              inline: true 
            }
          );

          await interaction.editReply({ embeds: [embed] });

        } catch (error) {
          const errorEmbed = embedConfig.createErrorEmbed(
            "Erreur lors du changement d'avatar",
            `Impossible de modifier l'avatar du bot.\n\n**Erreur:** \`${error.message}\``,
            'bot'
          );
          await interaction.editReply({ embeds: [errorEmbed] });
        }

      } else if (subcommand === "banniere") {
        const attachment = interaction.options.getAttachment("image");

        // Vérifier que c'est une image
        if (!attachment.contentType.startsWith('image/')) {
          const errorEmbed = embedConfig.createErrorEmbed(
            "Fichier invalide",
            "Le fichier doit être une image (jpg, jpeg, png, gif, webp).",
            'bot'
          );
          return interaction.editReply({ embeds: [errorEmbed] });
        }

        try {
          await client.user.setBanner(attachment.url);

          const embed = embedConfig.createSuccessEmbed(
            "Bannière modifiée avec succès !",
            `**Nouvelle bannière :** [Voir l'image](${attachment.url})`,
            'bot'
          )
          .setImage(attachment.url)
          .addFields(
            { 
              name: "📊 Informations", 
              value: `**Nom:** \`${attachment.name}\`\n**Format:** \`${attachment.contentType}\`\n**Taille:** \`${(attachment.size / 1024).toFixed(1)}KB\``, 
              inline: true 
            },
            { 
              name: "⏰ Heure", 
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`, 
              inline: true 
            }
          );

          await interaction.editReply({ embeds: [embed] });

        } catch (error) {
          const errorEmbed = embedConfig.createErrorEmbed(
            "Erreur lors du changement de bannière",
            `Impossible de modifier la bannière du bot.\n\n**Erreur:** \`${error.message}\``,
            'bot'
          );
          await interaction.editReply({ embeds: [errorEmbed] });
        }

      } else if (subcommand === "avatar-url") {
        const avatarUrl = interaction.options.getString("url");

        // Vérifier que l'URL est valide
        if (!avatarUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          const errorEmbed = embedConfig.createErrorEmbed(
            "URL d'avatar invalide",
            "L'URL doit pointer vers une image valide (jpg, jpeg, png, gif, webp).",
            'bot'
          );
          return interaction.editReply({ embeds: [errorEmbed] });
        }

        try {
          await client.user.setAvatar(avatarUrl);

          const embed = embedConfig.createSuccessEmbed(
            "Avatar modifié avec succès !",
            `**Nouvel avatar :** [Voir l'image](${avatarUrl})`,
            'bot'
          )
          .setThumbnail(avatarUrl)
          .addFields(
            { 
              name: "📊 Informations", 
              value: `**URL:** \`${avatarUrl}\`\n**Format:** \`${avatarUrl.split('.').pop().toUpperCase()}\`\n**Taille:** \`1024x1024\``, 
              inline: true 
            },
            { 
              name: "⏰ Heure", 
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`, 
              inline: true 
            }
          );

          await interaction.editReply({ embeds: [embed] });

        } catch (error) {
          const errorEmbed = embedConfig.createErrorEmbed(
            "Erreur lors du changement d'avatar",
            `Impossible de modifier l'avatar du bot.\n\n**Erreur:** \`${error.message}\``,
            'bot'
          );
          await interaction.editReply({ embeds: [errorEmbed] });
        }

      } else if (subcommand === "banniere-url") {
        const bannerUrl = interaction.options.getString("url");

        // Vérifier que l'URL est valide
        if (!bannerUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          const errorEmbed = embedConfig.createErrorEmbed(
            "URL de bannière invalide",
            "L'URL doit pointer vers une image valide (jpg, jpeg, png, gif, webp).",
            'bot'
          );
          return interaction.editReply({ embeds: [errorEmbed] });
        }

        try {
          await client.user.setBanner(bannerUrl);

          const embed = embedConfig.createSuccessEmbed(
            "Bannière modifiée avec succès !",
            `**Nouvelle bannière :** [Voir l'image](${bannerUrl})`,
            'bot'
          )
          .setImage(bannerUrl)
          .addFields(
            { 
              name: "📊 Informations", 
              value: `**URL:** \`${bannerUrl}\`\n**Format:** \`${bannerUrl.split('.').pop().toUpperCase()}\`\n**Taille:** \`1920x1080\``, 
              inline: true 
            },
            { 
              name: "⏰ Heure", 
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`, 
              inline: true 
            }
          );

          await interaction.editReply({ embeds: [embed] });

        } catch (error) {
          const errorEmbed = embedConfig.createErrorEmbed(
            "Erreur lors du changement de bannière",
            `Impossible de modifier la bannière du bot.\n\n**Erreur:** \`${error.message}\``,
            'bot'
          );
          await interaction.editReply({ embeds: [errorEmbed] });
        }
      }

    } catch (error) {
      const errorEmbed = embedConfig.createErrorEmbed(
        "Erreur lors de la modification",
        `Une erreur est survenue lors de la modification du bot.\n\n**Erreur:** \`${error.message}\``,
        'bot'
      );
      
      try {
        await interaction.editReply({ embeds: [errorEmbed] });
      } catch (editError) {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },
};