const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "../../data/tempvoc.json");
if (!fs.existsSync(path.join(__dirname, "../../data"))) fs.mkdirSync(path.join(__dirname, "../../data"), { recursive: true });

function loadConfig() {
  if (!fs.existsSync(configPath)) return { guilds: {} };
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}
function saveConfig(cfg) {
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tempvoc-salon")
    .setDescription("Définir un salon vocal qui crée des vocs temporaires")
    .addChannelOption(option =>
      option.setName("salon")
        .setDescription("Choisis le salon vocal qui servira de générateur")
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const salon = interaction.options.getChannel("salon");
    if (!salon || salon.type !== ChannelType.GuildVoice) {
      return interaction.reply({ content: "❌ Choisis un salon vocal valide.", ephemeral: true });
    }

    const config = loadConfig();
    if (!config.guilds) config.guilds = {};
    config.guilds[interaction.guild.id] = config.guilds[interaction.guild.id] || {};
    config.guilds[interaction.guild.id].setupChannel = salon.id;
    if (!config.guilds[interaction.guild.id].tempChannels) config.guilds[interaction.guild.id].tempChannels = [];
    saveConfig(config);

    const embed = new EmbedBuilder()
      .setTitle("✅ Salon générateur défini")
      .setDescription(`Le salon ${salon} est maintenant le salon générateur de vocs temporaires.`)
      .setColor("#00FFFF")
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};