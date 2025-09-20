const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const embedConfig = require("../../utils/embedConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("emojify")
    .setDescription("Transforme le texte en emojis régionaux stylés ! 🔤")
    .addStringOption(option =>
      option.setName("texte")
        .setDescription("Texte à transformer en emojis")
        .setRequired(true)
        .setMaxLength(50)
    )
    .addStringOption(option =>
      option.setName("style")
        .setDescription("Style d'emojification")
        .setRequired(false)
        .addChoices(
          { name: "🔤 Régional", value: "regional" },
          { name: "🔢 Chiffres", value: "numbers" },
          { name: "🎭 Mixte", value: "mixed" }
        )
    ),

  async execute(interaction) {
    const texte = interaction.options.getString("texte");
    const style = interaction.options.getString("style") || "regional";

    // Vérification de la longueur
    if (texte.length > 50) {
      return interaction.reply({ 
        content: "❌ Le texte est trop long ! Maximum 50 caractères.", 
        ephemeral: true 
      });
    }

    let emojified;
    
    switch (style) {
      case "numbers":
        emojified = texte.split("").map(c => {
          if (/\d/.test(c)) return `:${c}:`;
          if (c === " ") return "   ";
          return c;
        }).join("");
        break;
        
      case "mixed":
        emojified = texte.split("").map(c => {
          if (/[a-z]/i.test(c)) return `:regional_indicator_${c.toLowerCase()}:`;
          if (/\d/.test(c)) return `:${c}:`;
          if (c === " ") return "   ";
          return c;
        }).join("");
        break;
        
      default: // regional
        emojified = texte.split("").map(c => {
          if (/[a-z]/i.test(c)) return `:regional_indicator_${c.toLowerCase()}:`;
          if (/\d/.test(c)) return `:${c}:`;
          if (c === " ") return "   ";
          return c;
        }).join("");
    }

    if (!emojified || emojified.length === 0) {
      return interaction.reply({ 
        content: "❌ Impossible de transformer ce texte !", 
        ephemeral: true 
      });
    }

    const embed = embedConfig.createEmbedWithFooter(
      'fun',
      '🔤 Emojification réussie !',
      `**Texte original :**\n\`${texte}\`\n\n**Texte emojifié :**\n${emojified}`,
      interaction.user
    )
    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { 
        name: "📝 Informations", 
        value: `**Longueur:** \`${texte.length} caractères\`\n**Style:** \`${style.charAt(0).toUpperCase() + style.slice(1)}\`\n**Type:** \`Emojis régionaux\``, 
        inline: true 
      },
      { 
        name: "🎨 Styles disponibles", 
        value: "**🔤 Régional** - Lettres en emojis\n**🔢 Chiffres** - Nombres en emojis\n**🎭 Mixte** - Lettres + chiffres", 
        inline: true 
      },
      { 
        name: "💡 Astuce", 
        value: "Utilise `/emojify` avec différents styles pour créer des messages originaux !", 
        inline: true 
      }
    );

    await interaction.reply({ embeds: [embed] });
  },
};