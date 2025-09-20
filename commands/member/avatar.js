const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const embedConfig = require("../../utils/embedConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Affiche les avatars global et serveur du membre")
    .addUserOption(option =>
      option.setName("membre")
        .setDescription("Choisis un membre")
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("membre") || interaction.user;
    const userId = targetUser.id;

    try {
      // Fetch complet pour récupérer avatars
      const user = await interaction.client.users.fetch(userId, { force: true });
      const member = await interaction.guild.members.fetch(userId);

      const globalAvatar = user.displayAvatarURL({ dynamic: true, size: 1024 });
      const serverAvatar = member.avatarURL({ dynamic: true, size: 1024 });

      const embed = embedConfig.createEmbedWithFooter(
        'member',
        `🖼️ Avatar de ${user.username}`,
        `Voici les avatars de **${user.tag}**\n\n**Clique sur les boutons ci-dessous pour télécharger les avatars !**`,
        interaction.user
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { 
          name: "🌐 Avatar Global", 
          value: `**Format:** \`PNG/GIF\`\n**Taille:** \`1024x1024\`\n**Lien:** [Clique ici](${globalAvatar})`, 
          inline: true 
        },
        { 
          name: "🏠 Avatar Serveur", 
          value: serverAvatar ? 
            `**Format:** \`PNG/GIF\`\n**Taille:** \`1024x1024\`\n**Lien:** [Clique ici](${serverAvatar})` : 
            "**Aucun avatar serveur**\n*Utilise l'avatar global*", 
          inline: true 
        },
        { 
          name: "ℹ️ Informations", 
          value: `**ID:** \`${user.id}\`\n**Créé:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>\n**Bot:** ${user.bot ? 'Oui' : 'Non'}`, 
          inline: true 
        }
      );

      // Affichage de la plus spécifique (serveur si dispo, sinon global)
      embed.setImage(serverAvatar || globalAvatar);

      const row = new ActionRowBuilder();
      if (globalAvatar) {
        row.addComponents(
          new ButtonBuilder()
            .setLabel("🌐 Avatar Global")
            .setStyle(ButtonStyle.Link)
            .setURL(globalAvatar)
        );
      }
      if (serverAvatar) {
        row.addComponents(
          new ButtonBuilder()
            .setLabel("🏠 Avatar Serveur")
            .setStyle(ButtonStyle.Link)
            .setURL(serverAvatar)
        );
      }

      await interaction.reply({ embeds: [embed], components: row.components.length ? [row] : [] });

    } catch (error) {
      const errorEmbed = embedConfig.createErrorEmbed(
        "Erreur lors de la récupération",
        `Impossible de récupérer les informations de cet utilisateur.\n\n**Erreur:** \`${error.message}\``,
        'member'
      )
      .addFields(
        { 
          name: "🔧 Solutions possibles", 
          value: "• Vérifiez que l'utilisateur existe\n• Vérifiez que l'utilisateur est sur le serveur\n• Réessayez dans quelques instants", 
          inline: false 
        }
      );

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};