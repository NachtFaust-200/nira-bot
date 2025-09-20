const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bisou")
    .setDescription("Envoie un bisou anime à quelqu'un ! 💋")
    .addUserOption(option =>
      option.setName("membre")
        .setDescription("Le membre à embrasser")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("message")
        .setDescription("Message personnalisé")
        .setRequired(false)
        .setMaxLength(100)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("membre");
    const message = interaction.options.getString("message");

    // Empêche l'auto-bisou
    if (user.id === interaction.user.id) {
      return interaction.reply({ 
        content: "❌ Tu ne peux pas t'embrasser toi-même ! 😅", 
        ephemeral: true 
      });
    }

    // Empêche d'embrasser le bot
    if (user.id === interaction.client.user.id) {
      return interaction.reply({ 
        content: "❌ *rougit* Je... je ne peux pas t'embrasser ! 😳", 
        ephemeral: true 
      });
    }

    try {
      await interaction.deferReply();

      const res = await fetch("https://api.waifu.pics/sfw/kiss");
      const data = await res.json();

      // Messages romantiques aléatoires
      const kissMessages = [
        "💋 *mwah* 💋",
        "💖 Un bisou doux et tendre 💖",
        "😘 *kiss* 😘",
        "💕 Un bisou anime spécial 💕",
        "💝 *muah* 💝",
        "💗 Un bisou plein d'amour 💗"
      ];

      const randomMessage = kissMessages[Math.floor(Math.random() * kissMessages.length)];
      const description = message 
        ? `${interaction.user} embrasse ${user} ${randomMessage}\n\n**Message :** ${message}` 
        : `${interaction.user} embrasse ${user} ${randomMessage}`;

      const embed = new EmbedBuilder()
        .setTitle("💋 Bisou Anime !")
        .setDescription(description)
        .setImage(data.url)
        .setColor("#FF69B4")
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "💕 Type", value: "Bisou anime", inline: true },
          { name: "💖 Intensité", value: "Romantique", inline: true },
          { name: "🎌 Style", value: "Kawaii", inline: true }
        )
        .setFooter({ 
          text: `Demandé par ${interaction.user.username} • Waifu.pics`, 
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("Erreur dans anime-bisou:", error);
      
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