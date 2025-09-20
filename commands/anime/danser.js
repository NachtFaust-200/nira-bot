const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("danser")
    .setDescription("Montre tes talents de danseur anime ! 🕺")
    .addStringOption(option =>
      option.setName("style")
        .setDescription("Style de danse")
        .setRequired(false)
        .addChoices(
          { name: "🕺 Hip-Hop", value: "hiphop" },
          { name: "💃 Salsa", value: "salsa" },
          { name: "🎭 Ballet", value: "ballet" },
          { name: "🎵 K-Pop", value: "kpop" },
          { name: "🎌 Anime", value: "anime" },
          { name: "🎪 Breakdance", value: "breakdance" }
        )
    )
    .addUserOption(option =>
      option.setName("partenaire")
        .setDescription("Partenaire de danse (optionnel)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const style = interaction.options.getString("style") || "anime";
    const partner = interaction.options.getUser("partenaire");

    try {
      await interaction.deferReply();

      const res = await fetch("https://api.waifu.pics/sfw/dance");
      const data = await res.json();

      // Messages de danse selon le style
      const danceMessages = {
        hiphop: ["🕺 *danse hip-hop* 🕺", "🕺 Montre tes moves de hip-hop !", "🕺 *breakdance moves* 🕺"],
        salsa: ["💃 *danse salsa* 💃", "💃 Des pas de salsa enflammés !", "💃 *salsa moves* 💃"],
        ballet: ["🎭 *danse ballet* 🎭", "🎭 Une danse classique élégante", "🎭 *ballet moves* 🎭"],
        kpop: ["🎵 *danse K-Pop* 🎵", "🎵 Des mouvements K-Pop parfaits !", "🎵 *K-Pop choreography* 🎵"],
        anime: ["🎌 *danse anime* 🎌", "🎌 Une danse kawaii anime !", "🎌 *anime dance* 🎌"],
        breakdance: ["🎪 *breakdance* 🎪", "🎪 Des figures de breakdance !", "🎪 *breakdance moves* 🎪"]
      };

      const randomMessage = danceMessages[style][Math.floor(Math.random() * danceMessages[style].length)];
      const description = partner 
        ? `${interaction.user} danse avec ${partner} ${randomMessage} 💃` 
        : `${interaction.user} ${randomMessage} 💃`;

      // Couleurs selon le style
      const colors = {
        hiphop: "#8B4513",
        salsa: "#FF4500",
        ballet: "#DDA0DD",
        kpop: "#FF69B4",
        anime: "#00BFFF",
        breakdance: "#FFD700"
      };

      const embed = new EmbedBuilder()
        .setTitle("🕺 Danse Anime !")
        .setDescription(description)
        .setImage(data.url)
        .setColor(colors[style])
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "💃 Style", value: style.charAt(0).toUpperCase() + style.slice(1), inline: true },
          { name: "🎵 Type", value: partner ? "Duo" : "Solo", inline: true },
          { name: "🎌 Niveau", value: "Pro", inline: true }
        )
        .setFooter({ 
          text: `Demandé par ${interaction.user.username} • Waifu.pics`, 
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("Erreur dans anime-danser:", error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Erreur")
        .setDescription("Impossible de récupérer l'image. Réessayez plus tard !")
        .setColor("#FF0000")
        .setFooter({ text: "Erreur API • Nira Bot" })
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};