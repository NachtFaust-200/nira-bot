const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("devine")
    .setDescription("Devine le nombre mystère ! 🎯")
    .addIntegerOption(option =>
      option.setName("max")
        .setDescription("Nombre maximum (défaut: 1000)")
        .setMinValue(10)
        .setMaxValue(10000)
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName("temps")
        .setDescription("Temps en secondes (défaut: 60)")
        .setMinValue(30)
        .setMaxValue(300)
        .setRequired(false)
    ),

  async execute(interaction) {
    const max = interaction.options.getInteger("max") || 1000;
    const temps = (interaction.options.getInteger("temps") || 60) * 1000;
    const number = Math.floor(Math.random() * (max + 1));
    
    let attempts = 0;
    let gameActive = true;

    const embed = new EmbedBuilder()
      .setTitle("🎯 Jeu du Nombre Mystère")
      .setDescription(`J'ai choisi un nombre entre **0** et **${max}** !\n\nTapez vos essais dans le chat !`)
      .setColor("#FF6B6B")
      .addFields(
        { name: "⏰ Temps", value: `${temps/1000} secondes`, inline: true },
        { name: "🎯 Essais", value: "0", inline: true },
        { name: "📊 Plage", value: `0 - ${max}`, inline: true }
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: "Tapez un nombre dans le chat pour jouer !" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    const filter = m => !isNaN(m.content) && !m.author.bot && gameActive;
    const collector = interaction.channel.createMessageCollector({ filter, time: temps });

    collector.on("collect", async m => {
      if (!gameActive) return;
      
      const guess = parseInt(m.content);
      attempts++;

      if (guess < 0 || guess > max) {
        await m.reply(`❌ Le nombre doit être entre 0 et ${max} !`);
        return;
      }

      if (guess === number) {
        gameActive = false;
        collector.stop();
        
        const winEmbed = new EmbedBuilder()
          .setTitle("🎉 Félicitations !")
          .setDescription(`**${m.author}** a trouvé le nombre mystère !\n\n**Nombre :** \`${number}\`\n**Essais :** \`${attempts}\`\n**Temps :** \`${Math.floor((Date.now() - interaction.createdTimestamp) / 1000)}s\``)
          .setColor("#00FF00")
          .addFields(
            { name: "🏆 Score", value: `${Math.max(0, 1000 - attempts * 10)} points`, inline: true },
            { name: "🎯 Précision", value: `${Math.round((1 / attempts) * 100)}%`, inline: true },
            { name: "⚡ Vitesse", value: `${Math.round(attempts / ((Date.now() - interaction.createdTimestamp) / 1000) * 60)} essais/min`, inline: true }
          )
          .setThumbnail(m.author.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: "Jeu terminé • Nira Bot" })
          .setTimestamp();

        await interaction.editReply({ embeds: [winEmbed] });
        await m.react("🎉");
        
      } else {
        const hint = guess < number ? "⬆️ Plus grand !" : "⬇️ Plus petit !";
        const difference = Math.abs(guess - number);
        const closeness = difference <= max * 0.1 ? "🔥 Très proche !" : 
                         difference <= max * 0.25 ? "🔥 Proche !" : 
                         difference <= max * 0.5 ? "🌡️ Pas mal" : "❄️ Loin !";
        
        await m.reply(`${hint} ${closeness} (Essai ${attempts})`);
        
        // Mise à jour de l'embed
        const updateEmbed = new EmbedBuilder()
          .setTitle("🎯 Jeu du Nombre Mystère")
          .setDescription(`J'ai choisi un nombre entre **0** et **${max}** !\n\nTapez vos essais dans le chat !`)
          .setColor("#FF6B6B")
          .addFields(
            { name: "⏰ Temps restant", value: `${Math.max(0, Math.floor((temps - (Date.now() - interaction.createdTimestamp)) / 1000))}s`, inline: true },
            { name: "🎯 Essais", value: attempts.toString(), inline: true },
            { name: "📊 Plage", value: `0 - ${max}`, inline: true },
            { name: "💡 Dernier essai", value: `\`${guess}\` - ${hint}`, inline: false }
          )
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: "Tapez un nombre dans le chat pour jouer !" })
          .setTimestamp();

        await interaction.editReply({ embeds: [updateEmbed] });
      }
    });

    collector.on("end", async () => {
      if (gameActive) {
        gameActive = false;
        
        const timeoutEmbed = new EmbedBuilder()
          .setTitle("⏰ Temps écoulé !")
          .setDescription(`Le nombre mystère était **${number}** !\n\n**Essais effectués :** ${attempts}`)
          .setColor("#FF0000")
          .addFields(
            { name: "🎯 Plage", value: `0 - ${max}`, inline: true },
            { name: "⏰ Durée", value: `${temps/1000} secondes`, inline: true },
            { name: "📊 Taux de réussite", value: "0%", inline: true }
          )
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: "Jeu terminé • Nira Bot" })
          .setTimestamp();

        await interaction.editReply({ embeds: [timeoutEmbed] });
      }
    });
  },
};