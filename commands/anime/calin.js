const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("calin")
    .setDescription("Donne un câlin anime réconfortant ! 🤗")
    .addUserOption(option =>
      option.setName("membre")
        .setDescription("Le membre à câliner")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("type")
        .setDescription("Type de câlin")
        .setRequired(false)
        .addChoices(
          { name: "🤗 Câlin doux", value: "doux" },
          { name: "💪 Câlin fort", value: "fort" },
          { name: "😊 Câlin timide", value: "timide" },
          { name: "🎉 Câlin joyeux", value: "joyeux" }
        )
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("membre");
    const type = interaction.options.getString("type") || "doux";

    // Empêche l'auto-câlin
    if (user.id === interaction.user.id) {
      return interaction.reply({ 
        content: "❌ Tu ne peux pas te faire un câlin à toi-même ! 😅", 
        ephemeral: true 
      });
    }

    // Empêche de câliner le bot
    if (user.id === interaction.client.user.id) {
      return interaction.reply({ 
        content: "❌ *se recroqueville* Je... je suis timide ! 😳", 
        ephemeral: true 
      });
    }

    try {
      await interaction.deferReply();

      const res = await fetch("https://api.waifu.pics/sfw/hug");
      const data = await res.json();

      // Messages de câlin selon le type
      const hugMessages = {
        doux: ["🤗 Un câlin doux et chaleureux", "💕 *câlin tendre* 💕", "🤗 Un câlin réconfortant"],
        fort: ["💪 Un gros câlin fort !", "🤗 *câlin puissant* 💪", "💪 Un câlin qui fait du bien"],
        timide: ["😊 Un petit câlin timide", "😳 *câlin hésitant* 😊", "😊 Un câlin tout doux"],
        joyeux: ["🎉 Un câlin joyeux !", "🤗 *câlin enthousiaste* 🎉", "🎉 Un câlin plein de joie"]
      };

      const randomMessage = hugMessages[type][Math.floor(Math.random() * hugMessages[type].length)];
      const description = `${interaction.user} fait un câlin à ${user} ${randomMessage} ❤️`;

      // Couleurs selon le type
      const colors = {
        doux: "#FFB6C1",
        fort: "#FF6347", 
        timide: "#DDA0DD",
        joyeux: "#FFD700"
      };

      const embed = new EmbedBuilder()
        .setTitle("🤗 Câlin Anime !")
        .setDescription(description)
        .setImage(data.url)
        .setColor(colors[type])
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "🤗 Type", value: `Câlin ${type}`, inline: true },
          { name: "💖 Intensité", value: type === "fort" ? "Élevée" : type === "timide" ? "Faible" : "Moyenne", inline: true },
          { name: "🎌 Style", value: "Anime", inline: true }
        )
        .setFooter({ 
          text: `Demandé par ${interaction.user.username} • Waifu.pics`, 
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("Erreur dans anime-calin:", error);
      
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