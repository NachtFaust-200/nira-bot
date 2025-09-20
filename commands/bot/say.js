const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Envoie un message personnalisé dans un salon spécifié")
    .addChannelOption(option =>
      option.setName("salon")
        .setDescription("Salon où envoyer le message")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true))
    .addStringOption(option =>
      option.setName("message")
        .setDescription("Message à envoyer")
        .setRequired(true)
        .setMaxLength(2000))
    .addStringOption(option =>
      option.setName("titre")
        .setDescription("Titre du message (optionnel)")
        .setMaxLength(256)
        .setRequired(false))
    .addBooleanOption(option =>
      option.setName("embed")
        .setDescription("Envoyer le message sous forme d'embed")
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const channel = interaction.options.getChannel("salon");
    const message = interaction.options.getString("message");
    const title = interaction.options.getString("titre");
    const useEmbed = interaction.options.getBoolean("embed") || false;

    // Vérification des permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ 
        content: "❌ Vous n'avez pas les permissions nécessaires pour utiliser cette commande.", 
        ephemeral: true 
      });
    }

    // Vérification que le bot peut envoyer des messages dans le salon
    if (!channel.permissionsFor(interaction.guild.members.me).has('SendMessages')) {
      return interaction.reply({ 
        content: "❌ Je n'ai pas la permission d'envoyer des messages dans ce salon.", 
        ephemeral: true 
      });
    }

    try {
      if (useEmbed) {
        const embed = new EmbedBuilder()
          .setDescription(message)
          .setColor("#00FFFF")
          .setFooter({ 
            text: `Envoyé par ${interaction.user.username}`, 
            iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
          })
          .setTimestamp();

        if (title) {
          embed.setTitle(title);
        }

        await channel.send({ embeds: [embed] });
      } else {
        await channel.send(message);
      }

      // Confirmation avec embed
      const confirmEmbed = new EmbedBuilder()
        .setTitle("✅ Message envoyé avec succès")
        .setDescription(`**Salon:** ${channel}\n**Type:** ${useEmbed ? 'Embed' : 'Texte'}\n**Contenu:** ${message.length > 100 ? message.substring(0, 100) + '...' : message}`)
        .setColor("#00FF00")
        .setThumbnail(channel.guild.iconURL({ dynamic: true }))
        .setFooter({ text: `Envoyé par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });

    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Erreur lors de l'envoi")
        .setDescription("Une erreur est survenue lors de l'envoi du message.")
        .setColor("#FF0000")
        .addFields(
          { name: "Erreur", value: `\`${error.message}\``, inline: false },
          { name: "Salon cible", value: `${channel}`, inline: true },
          { name: "Type", value: useEmbed ? 'Embed' : 'Texte', inline: true }
        )
        .setFooter({ text: "Erreur • Nira Bot" })
        .setTimestamp();

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};