const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bot-modifier")
    .setDescription("Commande permettant de modifier le bot"),

  async execute(interaction) {
    // Ici tu peux ajouter des fonctionnalités pour modifier le bot
    await interaction.reply("⚙️ Cette commande est en cours de configuration.");
  },
};