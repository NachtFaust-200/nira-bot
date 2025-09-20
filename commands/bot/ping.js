const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const embedConfig = require("../../utils/embedConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Vérifie la latence du bot et de l'API Discord"),

  async execute(interaction) {
    const sent = await interaction.reply({ content: "🏓 Calcul de la latence...", fetchReply: true });

    const botLatency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = interaction.client.ws.ping;
    
    // Détermine la couleur selon la latence
    let color = "#00FF00"; // Vert
    if (botLatency > 200 || apiLatency > 200) color = "#FFA500"; // Orange
    if (botLatency > 500 || apiLatency > 500) color = "#FF0000"; // Rouge

    // Détermine le statut
    let status = "🟢 Excellent";
    if (botLatency > 200 || apiLatency > 200) status = "🟡 Bon";
    if (botLatency > 500 || apiLatency > 500) status = "🔴 Lent";

    const embed = embedConfig.createEmbedWithFooter(
      'bot',
      `🏓 Ping du bot - ${status}`,
      `**Statut de connexion:** ${status}\n\n**Temps de réponse:** ${botLatency}ms\n**Latence API Discord:** ${apiLatency}ms`,
      interaction.user
    )
    .setThumbnail(interaction.client.user.displayAvatarURL())
    .setColor(color)
    .addFields(
      { 
        name: "⚡ Performance", 
        value: `**Latence Bot:** \`${botLatency}ms\`\n**Latence API:** \`${apiLatency}ms\`\n**Statut:** ${status}`, 
        inline: true 
      },
      { 
        name: "📊 Statistiques", 
        value: `**Serveurs:** \`${interaction.client.guilds.cache.size}\`\n**Utilisateurs:** \`${interaction.client.users.cache.size}\`\n**Mémoire:** \`${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\``, 
        inline: true 
      },
      { 
        name: "🕐 Temps d'activité", 
        value: `**Uptime:** \`${Math.floor(interaction.client.uptime / 1000 / 60)}min\`\n**Node.js:** \`${process.version}\`\n**Discord.js:** \`v${require('discord.js').version}\``, 
        inline: true 
      }
    );

    await interaction.editReply({ content: null, embeds: [embed] });
  },
};