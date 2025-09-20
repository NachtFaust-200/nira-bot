const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("chatouiller")
    .setDescription("Chatouille quelqu'un avec des rires garantis ! 😂")
    .addUserOption(option =>
      option.setName("membre")
        .setDescription("La personne à chatouiller")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("intensite")
        .setDescription("Intensité des chatouilles")
        .setRequired(false)
        .addChoices(
          { name: "😊 Douces", value: "douces" },
          { name: "😂 Normales", value: "normales" },
          { name: "🤣 Intenses", value: "intenses" },
          { name: "😭 Extrêmes", value: "extremes" }
        )
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("membre");
    const intensite = interaction.options.getString("intensite") || "normales";

    // Empêche l'auto-chatouille
    if (user.id === interaction.user.id) {
      return interaction.reply({ 
        content: "❌ Tu ne peux pas te chatouiller toi-même ! 😅", 
        ephemeral: true 
      });
    }

    // Empêche de chatouiller le bot
    if (user.id === interaction.client.user.id) {
      return interaction.reply({ 
        content: "❌ *gigote* Non non non ! Je suis trop sensible ! 😳", 
        ephemeral: true 
      });
    }

    try {
      await interaction.deferReply();

      const res = await fetch("https://api.waifu.pics/sfw/tickle");
      const data = await res.json();

      // Messages de chatouilles selon l'intensité
      const tickleMessages = {
        douces: ["😊 *chatouilles douces* 😊", "😊 Des chatouilles tout en douceur", "😊 *tickle tickle* 😊"],
        normales: ["😂 *chatouilles normales* 😂", "😂 Des chatouilles classiques", "😂 *tickle tickle* 😂"],
        intenses: ["🤣 *chatouilles intenses* 🤣", "🤣 Des chatouilles qui font rire !", "🤣 *TICKLE TICKLE* 🤣"],
        extremes: ["😭 *CHATOUILLES EXTRÊMES* 😭", "😭 Des chatouilles à mort !", "😭 *TICKLE TICKLE TICKLE* 😭"]
      };

      const randomMessage = tickleMessages[intensite][Math.floor(Math.random() * tickleMessages[intensite].length)];
      const description = `${interaction.user} chatouille ${user} ${randomMessage} 🎉`;

      // Couleurs selon l'intensité
      const colors = {
        douces: "#FFE4E1",
        normales: "#FFFF00",
        intenses: "#FFA500",
        extremes: "#FF4500"
      };

      const embed = new EmbedBuilder()
        .setTitle("😂 Chatouilles Anime !")
        .setDescription(description)
        .setImage(data.url)
        .setColor(colors[intensite])
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "😂 Type", value: `Chatouilles ${intensite}`, inline: true },
          { name: "🎉 Niveau", value: intensite === "douces" ? "1/4" : intensite === "normales" ? "2/4" : intensite === "intenses" ? "3/4" : "4/4", inline: true },
          { name: "🎌 Style", value: "Anime", inline: true }
        )
        .setFooter({ 
          text: `Demandé par ${interaction.user.username} • Waifu.pics`, 
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("Erreur dans anime-chatouiller:", error);
      
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