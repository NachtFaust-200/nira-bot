const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const embedConfig = require("../../utils/embedConfig");
require("dotenv").config();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bot-info")
    .setDescription("Affiche les informations détaillées du bot et du créateur"),

  async execute(interaction, client) {
    const totalSeconds = client.uptime / 1000;
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const uptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    // Calcul des statistiques
    const totalUsers = client.users.cache.size;
    const totalGuilds = client.guilds.cache.size;
    const totalChannels = client.channels.cache.size;
    const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const nodeVersion = process.version;
    const discordJsVersion = require("discord.js").version;

    // Calcul du pourcentage de shards (si applicable)
    const shardInfo = client.shard ? `Shard ${client.shard.ids[0] + 1}/${client.shard.count}` : "Aucun shard";

    const embed = embedConfig.createEmbedWithFooter(
      'bot',
      '🤖 Informations du bot',
      `**Informations détaillées sur le bot et ses performances**\n\n**Nom:** ${client.user.username}\n**ID:** \`${client.user.id}\`\n**Créé le:** <t:${Math.floor(client.user.createdTimestamp / 1000)}:R>\n**Version:** v2.0.0`,
      interaction.user,
      `Demandé par ${interaction.user.username} • ${new Date().toLocaleDateString('fr-FR')}`
    )
    .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
    .addFields(
      { 
        name: "📊 Statistiques du Bot", 
        value: `**Serveurs:** \`${totalGuilds}\`\n**Utilisateurs:** \`${totalUsers}\`\n**Salons:** \`${totalChannels}\`\n**Shard:** \`${shardInfo}\``, 
        inline: true 
      },
      { 
        name: "⚡ Performance", 
        value: `**Uptime:** \`${uptime}\`\n**Mémoire:** \`${memoryUsage}MB\`\n**Ping API:** \`${client.ws.ping}ms\`\n**Node.js:** \`${nodeVersion}\``, 
        inline: true 
      },
      { 
        name: "🔧 Développement", 
        value: `**Discord.js:** \`v${discordJsVersion}\`\n**Créateur:** ${process.env.CREATOR_TAG || "Stefan Fensie"}\n**Support:** [Serveur Discord](https://discord.gg/your-server)`, 
        inline: true 
      }
    );

    await interaction.reply({ embeds: [embed] });
  },
};