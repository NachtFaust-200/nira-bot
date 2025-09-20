// utils/musicPlayer.js - Système de musique avancé
const { joinVoiceChannel, createAudioPlayer, createAudioResource, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const { play } = require('play-dl');
const SpotifyWebApi = require('spotify-web-api-node');

class MusicPlayer {
  constructor() {
    this.connections = new Map(); // Map<guildId, connection>
    this.players = new Map(); // Map<guildId, player>
    this.queues = new Map(); // Map<guildId, queue>
    
    // Configuration Spotify (optionnelle)
    this.spotify = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    });
  }

  // Détecter le type de lien
  detectLinkType(url) {
    if (url.includes('spotify.com')) return 'spotify';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('soundcloud.com')) return 'soundcloud';
    return 'search';
  }

  // Extraire l'ID Spotify
  extractSpotifyId(url) {
    const match = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  // Rechercher sur Spotify et convertir en YouTube
  async searchSpotifyTrack(trackId) {
    try {
      if (!this.spotify.getAccessToken()) {
        // Si pas de token Spotify, faire une recherche YouTube normale
        return null;
      }

      const track = await this.spotify.getTrack(trackId);
      const searchQuery = `${track.body.artists[0].name} ${track.body.name}`;
      
      // Rechercher sur YouTube
      const results = await play.search(searchQuery, { limit: 1 });
      return results[0] || null;
    } catch (error) {
      console.error('Erreur recherche Spotify:', error);
      return null;
    }
  }

  // Ajouter une musique à la queue
  async addToQueue(guildId, musicData) {
    if (!this.queues.has(guildId)) {
      this.queues.set(guildId, []);
    }
    
    const queue = this.queues.get(guildId);
    queue.push(musicData);
    
    return queue.length;
  }

  // Obtenir la queue
  getQueue(guildId) {
    return this.queues.get(guildId) || [];
  }

  // Vider la queue
  clearQueue(guildId) {
    this.queues.set(guildId, []);
  }

  // Jouer une musique
  async playMusic(guildId, voiceChannel, musicData) {
    try {
      // Créer la connexion vocale
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      this.connections.set(guildId, connection);

      // Créer le lecteur audio
      const player = createAudioPlayer();
      this.players.set(guildId, player);
      connection.subscribe(player);

      // Attendre que la connexion soit prête
      await entersState(connection, VoiceConnectionStatus.Ready, 30e3);

      // Obtenir le stream audio
      const stream = await play.stream(musicData.url);
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
      });

      // Jouer la musique
      player.play(resource);

      // Gérer la fin de la musique
      player.on('stateChange', (oldState, newState) => {
        if (newState.status === 'idle') {
          this.playNext(guildId);
        }
      });

      return {
        title: musicData.title,
        duration: musicData.duration,
        thumbnail: musicData.thumbnail,
        url: musicData.url
      };

    } catch (error) {
      console.error('Erreur lecture musique:', error);
      throw error;
    }
  }

  // Jouer la musique suivante
  async playNext(guildId) {
    const queue = this.getQueue(guildId);
    if (queue.length === 0) {
      this.stop(guildId);
      return;
    }

    const nextMusic = queue.shift();
    const connection = this.connections.get(guildId);
    const player = this.players.get(guildId);

    if (!connection || !player) return;

    try {
      const stream = await play.stream(nextMusic.url);
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
      });

      player.play(resource);
    } catch (error) {
      console.error('Erreur musique suivante:', error);
      this.playNext(guildId); // Essayer la suivante
    }
  }

  // Arrêter la musique
  stop(guildId) {
    const connection = this.connections.get(guildId);
    if (connection) {
      connection.destroy();
      this.connections.delete(guildId);
    }
    
    this.players.delete(guildId);
    this.clearQueue(guildId);
  }

  // Passer la musique
  skip(guildId) {
    const player = this.players.get(guildId);
    if (player) {
      player.stop();
    }
  }

  // Ajuster le volume
  setVolume(guildId, volume) {
    const player = this.players.get(guildId);
    if (player) {
      player.volume = volume / 100;
    }
  }

  // Vérifier si une musique est en cours
  isPlaying(guildId) {
    return this.connections.has(guildId);
  }
}

module.exports = MusicPlayer;

