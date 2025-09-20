const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("baka")
    .setDescription("Traite quelqu'un de baka avec style ! 😡")
    .addUserOption(option =>
      option.setName("membre")
        .setDescription("La personne à traiter de baka")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("raison")
        .setDescription("Raison pour laquelle cette personne est baka")
        .setRequired(false)
        .setMaxLength(100)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("membre");
    const reason = interaction.options.getString("raison");

    // Empêche l'auto-insulte
    if (user.id === interaction.user.id) {
      return interaction.reply({ 
        content: "❌ Tu ne peux pas te traiter de baka toi-même ! 😅", 
        ephemeral: true 
      });
    }

    // Empêche d'insulter le bot
    if (user.id === interaction.client.user.id) {
      return interaction.reply({ 
        content: "❌ Hey ! Je ne suis pas baka ! 😤", 
        ephemeral: true 
      });
    }

    try {
      await interaction.deferReply();

      const res = await fetch("https://api.waifu.pics/sfw/slap");
      const data = await res.json();

      // Messages aléatoires pour plus de variété
      const bakaMessages = [
        "BAKA BAKA BAKA !!!",
        "Tu es vraiment baka !",
        "Baka desu ne~",
        "Nani ?! BAKA !",
        "Baka gaijin !",
        "Sugoi baka !"
      ];

      const randomMessage = bakaMessages[Math.floor(Math.random() * bakaMessages.length)];
      const description = reason 
        ? `${interaction.user} dit à ${user} : **${randomMessage}**\n\n**Raison :** ${reason}` 
        : `${interaction.user} dit à ${user} : **${randomMessage}**`;

      const embed = new EmbedBuilder()
        .setTitle("😡 Baka Attack !")
        .setDescription(description)
        .setImage(data.url)
        .setColor("#FF4444")
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "🎭 Action", value: "Slap + Baka", inline: true },
          { name: "💥 Intensité", value: "MAXIMUM", inline: true },
          { name: "🎌 Style", value: "Anime", inline: true }
        )
        .setFooter({ 
          text: `Demandé par ${interaction.user.username} • Waifu.pics`, 
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("Erreur dans anime-baka:", error);
      
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