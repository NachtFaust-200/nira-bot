const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bot-say")
    .setDescription("Commande pour envoyer un message dans un salon spécifié")
    .addChannelOption(option =>
      option.setName("salon")
        .setDescription("Salon où envoyer le message")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("message")
        .setDescription("Message à envoyer")
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const channel = interaction.options.getChannel("salon");
    const message = interaction.options.getString("message");

    await channel.send(message);
    await interaction.reply({ content: `✅ Message envoyé dans ${channel}`, ephemeral: true });
  },
};