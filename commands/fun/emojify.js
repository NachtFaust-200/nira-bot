const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fun-emojify")
    .setDescription("Transforme le texte en emojis correspondants")
    .addStringOption(option =>
      option.setName("texte")
        .setDescription("Texte à transformer en emojis")
        .setRequired(true)),

  async execute(interaction) {
    const texte = interaction.options.getString("texte");
    const emojified = texte.split("").map(c => {
      if (/[a-z]/i.test(c)) return `:regional_indicator_${c.toLowerCase()}:`;
      if (/\d/.test(c)) return `:${c}:`;
      if (c === " ") return "   ";
      return c;
    }).join("");
    await interaction.reply(emojified || "❌ Impossible de transformer ce texte !");
  },
};