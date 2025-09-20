const { AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');

// Configuration globale pour Discord Voice
module.exports = {
  // Configuration des modes de chiffrement supportés
  encryptionModes: [
    'aead_aes256_gcm_rtpsize',
    'aead_xchacha20_poly1305_rtpsize', 
    'xsalsa20_poly1305_lite_rtpsize'
  ],
  
  // Configuration des types de codec supportés
  codecTypes: ['opus'],
  
  // Configuration des formats audio supportés
  audioFormats: ['webm/opus', 'ogg/opus'],
  
  // Configuration des paramètres de connexion
  connectionConfig: {
    selfDeaf: false,
    selfMute: false,
    debug: false
  },
  
  // Configuration des paramètres de stream
  streamConfig: {
    filter: 'audioonly',
    quality: 'highestaudio',
    highWaterMark: 1 << 25,
    requestOptions: {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }
  },
  
  // Configuration des paramètres de ressource audio
  resourceConfig: {
    inputType: 'webm/opus',
    inlineVolume: true
  }
};
