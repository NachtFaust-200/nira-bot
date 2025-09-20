const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("Affiche des informations détaillées sur un membre")
    .addUserOption(option =>
      option.setName("membre")
        .setDescription("Choisis un membre")
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("membre") || interaction.user;
    const userId = targetUser.id;

    try {
      // Fetch complet pour avoir toutes les infos (banniere, avatar animé)
      const user = await interaction.client.users.fetch(userId, { force: true });
      const member = await interaction.guild.members.fetch(userId);

      // Avatar (global ou serveur si différent)
      const avatarURL = member.avatarURL({ dynamic: true, size: 1024 }) || user.displayAvatarURL({ dynamic: true, size: 1024 });

      // Bannière
      const bannerURL = user.bannerURL({ dynamic: true, size: 1024 });

      // Nitro détecté si avatar animé ou bannière existante
      const hasNitro = user.banner || user.avatar?.endsWith(".gif") ? "✅ Oui" : "❌ Non";

      // Boost
      const boostInfo = member.premiumSince ? `<t:${Math.floor(member.premiumSince / 1000)}:F>` : "❌ Aucun";

      // Roles
      const roles = member.roles.cache
        .filter(r => r.id !== interaction.guild.id)
        .map(r => r.toString())
        .join(", ") || "Aucun";

      // Statut
      const status = member.presence?.status || "Hors ligne";
      const statusEmoji = {
        online: "🟢",
        idle: "🟡", 
        dnd: "🔴",
        offline: "⚫"
      };

      const embed = new EmbedBuilder()
        .setTitle(`👤 Informations sur ${user.username}`)
        .setDescription(`Informations détaillées sur **${user.tag}**`)
        .setThumbnail(avatarURL)
        .setColor("#5865F2")
        .addFields(
          { name: "🆔 ID", value: `\`${user.id}\``, inline: true },
          { name: "👤 Nom d'utilisateur", value: user.username, inline: true },
          { name: "🏷️ Surnom", value: member.nickname || "Aucun", inline: true },
          { name: "🤖 Bot", value: user.bot ? "✅ Oui" : "❌ Non", inline: true },
          { name: "📅 Compte créé", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: true },
          { name: "📅 Rejoint le serveur", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true },
          { name: "💎 Nitro", value: hasNitro, inline: true },
          { name: "🚀 Boost", value: boostInfo, inline: true },
          { name: "📊 Statut", value: `${statusEmoji[status]} ${status}`, inline: true },
          { name: "🎭 Rôles", value: roles.length > 1000 ? roles.substring(0, 1000) + "..." : roles, inline: false }
        )
        .setFooter({ 
          text: `Demandé par ${interaction.user.username}`, 
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp();

      if (bannerURL) embed.setImage(bannerURL);

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Erreur")
        .setDescription("Impossible de récupérer les informations de cet utilisateur.")
        .setColor("#FF4444")
        .setFooter({ text: "Erreur • Nira Bot" })
        .setTimestamp();

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};