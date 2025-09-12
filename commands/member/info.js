const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("membre-info")
    .setDescription("Affiche des informations détaillées sur un membre")
    .addUserOption(option =>
      option.setName("membre")
        .setDescription("Choisis un membre")
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.options.getUser("membre").id;

    // Fetch complet pour avoir toutes les infos (banniere, avatar animé)
    const user = await interaction.client.users.fetch(userId, { force: true });
    const member = await interaction.guild.members.fetch(userId);

    // Avatar (global ou serveur si différent)
    const avatarURL = member.avatarURL({ dynamic: true, size: 1024 }) || user.displayAvatarURL({ dynamic: true, size: 1024 });

    // Bannière
    const bannerURL = user.bannerURL({ dynamic: true, size: 1024 }) || "Aucune bannière";

    // Nitro détecté si avatar animé ou bannière existante
    const hasNitro = user.banner || user.avatar?.endsWith(".gif") ? "✅ Oui" : "❌ Non";

    // Boost
    const boostInfo = member.premiumSince ? `<t:${Math.floor(member.premiumSince / 1000)}:F>` : "❌ Aucun";

    // Roles
    const roles = member.roles.cache
      .filter(r => r.id !== interaction.guild.id)
      .map(r => r.toString())
      .join(", ") || "Aucun";

    const embed = new EmbedBuilder()
      .setTitle(`ℹ️ Informations sur ${user.tag}`)
      .setThumbnail(avatarURL)
      .addFields(
        { name: "ID", value: user.id, inline: true },
        { name: "Nom", value: user.username, inline: true },
        { name: "Surnom", value: member.nickname || "Aucun", inline: true },
        { name: "Bot ?", value: user.bot ? "Oui" : "Non", inline: true },
        { name: "Date de création", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: true },
        { name: "Rejoint le serveur", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true },
        { name: "Nitro", value: hasNitro, inline: true },
        { name: "Boost", value: boostInfo, inline: true },
        { name: "Rôles", value: roles }
      )
      .setColor("#5865F2")
      .setFooter({ text: "Nira Bot • Infos membre", iconURL: interaction.client.user.displayAvatarURL() })
      .setTimestamp();

    if (bannerURL !== "Aucune bannière") embed.setImage(bannerURL);

    await interaction.reply({ embeds: [embed] });
  }
};