const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("membre-banniere")
    .setDescription("Affiche les bannières global et serveur du membre")
    .addUserOption(option =>
      option.setName("membre")
        .setDescription("Choisis un membre")
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.options.getUser("membre").id;

    const user = await interaction.client.users.fetch(userId, { force: true });
    const member = await interaction.guild.members.fetch(userId);

    const globalBanner = user.bannerURL({ dynamic: true, size: 1024 });
    const serverBanner = member.bannerURL({ dynamic: true, size: 1024 });

    if (!globalBanner && !serverBanner) {
      return interaction.reply({ content: "❌ Ce membre n'a pas de bannière.", ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`${user.tag} - Bannières`)
      .setColor("#FF2D55")
      .setFooter({ text: "Nira Bot • Bannière", iconURL: interaction.client.user.displayAvatarURL() })
      .setTimestamp();

    if (globalBanner) embed.addFields({ name: "Bannière globale Discord", value: `[Télécharger](${globalBanner})`, inline: true });
    if (serverBanner) embed.addFields({ name: "Bannière serveur", value: `[Télécharger](${serverBanner})`, inline: true });

    embed.setImage(serverBanner || globalBanner);

    const row = new ActionRowBuilder();
    if (globalBanner) row.addComponents(
      new ButtonBuilder().setLabel("Télécharger bannière globale").setStyle(ButtonStyle.Link).setURL(globalBanner)
    );
    if (serverBanner) row.addComponents(
      new ButtonBuilder().setLabel("Télécharger bannière serveur").setStyle(ButtonStyle.Link).setURL(serverBanner)
    );

    await interaction.reply({ embeds: [embed], components: row.components.length ? [row] : [] });
  }
};