const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, VoiceConnectionStatus, entersState, AudioPlayerStatus } = require('@discordjs/voice');
const { opus } = require('@discordjs/opus');
const play = require('play-dl');
const ytdl = require('@distube/ytdl-core');
const logger = require("../../utils/logger");
const voiceConfig = require("../../voice-config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Joue de la musique chill dans un salon vocal")
    .addStringOption(option =>
      option.setName("musique")
        .setDescription("Nom de la musique ou URL YouTube")
        .setRequired(true))
    .addChannelOption(option =>
      option.setName("salon")
        .setDescription("Salon vocal où jouer la musique")
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(false)),

  async execute(interaction, client) {
    const musicQuery = interaction.options.getString("musique");
    const voiceChannel = interaction.options.getChannel("salon") || interaction.member.voice.channel;

    // Vérifications
    if (!voiceChannel) {
      return interaction.reply({
        content: "❌ Vous devez être dans un salon vocal ou spécifier un salon.",
        ephemeral: true
      });
    }

    if (!interaction.member.voice.channel) {
      return interaction.reply({
        content: "❌ Vous devez être dans un salon vocal pour utiliser cette commande.",
        ephemeral: true
      });
    }

    if (voiceChannel.id !== interaction.member.voice.channel.id) {
      return interaction.reply({
        content: "❌ Vous devez être dans le même salon vocal que le bot.",
        ephemeral: true
      });
    }

    try {
      await interaction.deferReply();

      // Rechercher la musique avec play-dl
      let music = null;
      
      try {
        // Vérifier si c'est un lien YouTube direct
        if (musicQuery.includes('youtube.com') || musicQuery.includes('youtu.be')) {
          const videoInfo = await play.video_info(musicQuery);
          if (videoInfo) {
            music = {
              title: videoInfo.video_details.title,
              url: musicQuery,
              durationFormatted: videoInfo.video_details.durationRaw,
              thumbnails: [{ url: videoInfo.video_details.thumbnails[0]?.url }]
            };
          }
        } else {
          // Recherche par nom
          const searchResults = await play.search(musicQuery, { limit: 1 });
          if (!searchResults || searchResults.length === 0) {
            return interaction.editReply({
              content: "❌ Aucune musique trouvée pour cette recherche.",
              ephemeral: true
            });
          }
          music = searchResults[0];
          // S'assurer que l'URL est complète
          if (music.url && !music.url.startsWith('http')) {
            music.url = `https://www.youtube.com/watch?v=${music.url}`;
          }
        }
        
        if (!music) {
          return interaction.editReply({
            content: "❌ Aucune musique trouvée pour cette recherche.",
            ephemeral: true
          });
        }
      } catch (error) {
        logger.error("Erreur recherche play-dl", error);
        console.error("Erreur détaillée play-dl:", error);
        return interaction.editReply({
          content: "❌ Erreur lors de la recherche de musique. Veuillez réessayer avec un lien YouTube direct.",
          ephemeral: true
        });
      }

      // Créer la connexion vocale avec configuration de chiffrement
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        ...voiceConfig.connectionConfig
      });

      // Créer le lecteur audio
      const player = createAudioPlayer();
      connection.subscribe(player);

      // Attendre que la connexion soit prête
      await entersState(connection, VoiceConnectionStatus.Ready, 30e3);

      // Obtenir le stream audio avec @distube/ytdl-core
      const stream = ytdl(music.url, voiceConfig.streamConfig);
      
      const resource = createAudioResource(stream, {
        ...voiceConfig.resourceConfig,
        metadata: {
          title: music.title,
          url: music.url
        }
      });

      // Jouer la musique
      player.play(resource);

      // Embed de confirmation
      const embed = new EmbedBuilder()
        .setTitle("🎵 Musique en cours de lecture")
        .setDescription(`**${music.title}**`)
        .setColor("#9B59B6")
        .addFields(
          { name: "🎧 Salon", value: `${voiceChannel.name}`, inline: true },
          { name: "⏱️ Durée", value: music.durationFormatted || "Inconnue", inline: true },
          { name: "👤 Demandé par", value: `${interaction.user.tag}`, inline: true },
          { name: "🔗 Source", value: "YouTube", inline: true }
        )
        .setThumbnail(music.thumbnails?.[0]?.url || null)
        .setFooter({ text: "Musique chill activée", iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Log Discord si disponible
      const guildLogger = client.discordLoggers?.get(interaction.guild.id);
      if (guildLogger && guildLogger.isInitialized()) {
        await guildLogger.logEvent("musique_play", {
          title: music.title,
          user: interaction.user.tag,
          channel: voiceChannel.name,
          type: "youtube"
        });
      }
      logger.info(`Musique jouée: ${music.title} par ${interaction.user.tag} dans ${voiceChannel.name}`);

      // Gérer la fin de la musique
      player.on('stateChange', (oldState, newState) => {
        if (newState.status === 'idle') {
          connection.destroy();
        }
      });

    } catch (error) {
      logger.error("Erreur lors de la lecture de la musique", error);
      console.error("Erreur détaillée:", error);
      if (client.discordLoggers?.get(interaction.guild.id)) {
        await client.discordLoggers.get(interaction.guild.id).logError(error, { command: "play", user: interaction.user.tag });
      }
      await interaction.editReply({
        content: "❌ Une erreur est survenue lors de la lecture de la musique.",
        ephemeral: true
      });
    }
  },
};
