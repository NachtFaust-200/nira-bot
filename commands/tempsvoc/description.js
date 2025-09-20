const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "../../data/tempvoc.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tempsvoc-description")
    .setDescription("Définir une description pour le salon vocal temporaire")
    .addStringOption(option =>
      option.setName("texte")
        .setDescription("Texte de description")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const texte = interaction.options.getString("texte");

    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const guildId = interaction.guild.id;

    if (!config.guilds[guildId] || !config.guilds[guildId].setupChannel) {
      return interaction.reply({ content: "❌ Aucun salon temporaire défini. Utilise /tempvoc-salon d'abord.", ephemeral: true });
    }

    // Stocke la description dans le JSON
    config.guilds[guildId].description = texte;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    const embed = new EmbedBuilder()
      .setTitle("✅ Description définie")
      .setDescription(`La description pour les vocs temporaires est maintenant :\n"${texte}"`)
      .setColor("#00FFFF")
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};