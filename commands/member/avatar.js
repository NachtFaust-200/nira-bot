const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("membre-avatar")
    .setDescription("Affiche les avatars global et serveur du membre")
    .addUserOption(option =>
      option.setName("membre")
        .setDescription("Choisis un membre")
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.options.getUser("membre").id;

    // Fetch complet pour récupérer avatars
    const user = await interaction.client.users.fetch(userId, { force: true });
    const member = await interaction.guild.members.fetch(userId);

    const globalAvatar = user.displayAvatarURL({ dynamic: true, size: 1024 });
    const serverAvatar = member.avatarURL({ dynamic: true, size: 1024 });

    const embed = new EmbedBuilder()
      .setTitle(`${user.tag} - Avatars`)
      .setColor("#5865F2")
      .setFooter({ text: "Nira Bot • Avatar", iconURL: interaction.client.user.displayAvatarURL() })
      .setTimestamp();

    if (globalAvatar) embed.addFields({ name: "Avatar global Discord", value: `[Télécharger](${globalAvatar})`, inline: true });
    if (serverAvatar) embed.addFields({ name: "Avatar serveur", value: `[Télécharger](${serverAvatar})`, inline: true });

    // Affichage de la plus spécifique (serveur si dispo, sinon global)
    embed.setImage(serverAvatar || globalAvatar);

    const row = new ActionRowBuilder();
    if (globalAvatar) row.addComponents(
      new ButtonBuilder().setLabel("Télécharger avatar global").setStyle(ButtonStyle.Link).setURL(globalAvatar)
    );
    if (serverAvatar) row.addComponents(
      new ButtonBuilder().setLabel("Télécharger avatar serveur").setStyle(ButtonStyle.Link).setURL(serverAvatar)
    );

    await interaction.reply({ embeds: [embed], components: row.components.length ? [row] : [] });
  }
};