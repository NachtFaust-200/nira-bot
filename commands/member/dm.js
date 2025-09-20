const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("membre-dm")
    .setDescription("Envoie un message direct à un membre du serveur")
    .addUserOption(option =>
      option.setName("membre")
        .setDescription("Choisis un membre")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("message")
        .setDescription("Message à envoyer")
        .setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("membre");
    const messageContent = interaction.options.getString("message");

    try {
      await user.send(`📨 Message de **${interaction.user.tag}** :\n\n${messageContent}`);

      const embed = new EmbedBuilder()
        .setTitle("✅ DM envoyé")
        .setDescription(`Votre message a été envoyé avec succès à ${user.tag}`)
        .setColor("#57F287")
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Impossible d'envoyer le DM")
        .setDescription(`Je n'ai pas pu envoyer de message à ${user.tag}. Ils ont peut-être désactivé les DMs.`)
        .setColor("#ED4245")
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};