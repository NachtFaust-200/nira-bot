// index.js
const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits, ChannelType, PermissionsBitField } = require("discord.js");
require("dotenv").config();

// -------- 1) Création du client Discord --------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates // nécessaire pour tempvoc
  ],
});

client.commands = new Collection();

// -------- 2) Charger toutes les commandes --------
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
  
  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.data.name, command);
  }
}

// -------- 3) Gestion des stats --------
const statsPath = path.join(__dirname, "data/stats.json");
if (!fs.existsSync(statsPath)) {
  fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });
  fs.writeFileSync(statsPath, JSON.stringify({ users: {}, channels: {} }, null, 2));
}

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const stats = JSON.parse(fs.readFileSync(statsPath, "utf8"));

  // stats par utilisateur
  if (!stats.users[message.author.id]) stats.users[message.author.id] = { messages: 0 };
  stats.users[message.author.id].messages += 1;

  // stats par salon
  if (!stats.channels[message.channel.id]) stats.channels[message.channel.id] = { messages: 0 };
  stats.channels[message.channel.id].messages += 1;

  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
});

// -------- 4) Gestion des commandes slash --------
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error("Erreur commande:", error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "❌ Une erreur est survenue !", ephemeral: true });
      } else {
        await interaction.followUp({ content: "❌ Une erreur est survenue !", ephemeral: true });
      }
    } catch (err) {
      console.error("Impossible de répondre à l'interaction:", err);
    }
  }
});

// -------- 5) Gestion des salons vocaux temporaires --------
const tempvocPath = path.join(__dirname, "data/tempvoc.json");
if (!fs.existsSync(tempvocPath)) fs.writeFileSync(tempvocPath, JSON.stringify({ guilds: {} }, null, 2));

function loadTempvoc() {
  return JSON.parse(fs.readFileSync(tempvocPath, "utf8"));
}
function saveTempvoc(cfg) {
  fs.writeFileSync(tempvocPath, JSON.stringify(cfg, null, 2));
}

client.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    const config = loadTempvoc();
    const guildId = newState.guild?.id;
    if (!guildId || !config.guilds[guildId]) return;

    const setupChannelId = config.guilds[guildId].setupChannel;
    if (!setupChannelId) return;

    // Membre rejoint le channel setup → créer vocal temporaire
    if (newState.channelId === setupChannelId) {
      const member = newState.member;
      if (!member) return;

      const me = newState.guild.members.me;
      if (!me.permissions.has(PermissionsBitField.Flags.ManageChannels)) return;

      const categoryId = newState.channel?.parentId || null;
      const channelName = `${member.user.username} 🎧`;

      const tempChannel = await newState.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: categoryId
      });

      if (!config.guilds[guildId].tempChannels) config.guilds[guildId].tempChannels = [];
      config.guilds[guildId].tempChannels.push(tempChannel.id);
      saveTempvoc(config);

      try { await member.voice.setChannel(tempChannel.id); } catch {}

      return;
    }

    // Suppression des channels temporaires vides
    if (oldState.channelId) {
      const tempChannels = config.guilds[guildId]?.tempChannels || [];
      if (tempChannels.includes(oldState.channelId)) {
        const oldChannel = oldState.guild.channels.cache.get(oldState.channelId);
        if (oldChannel && oldChannel.members.size === 0) {
          try { await oldChannel.delete("Salon temporaire vide"); } catch {}
          config.guilds[guildId].tempChannels = tempChannels.filter(id => id !== oldState.channelId);
          saveTempvoc(config);
        }
      }
    }
  } catch (err) { console.error("Erreur voiceStateUpdate:", err); }
});

// -------- 6) Ready --------
client.once("ready", () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
});

// -------- 7) Serveur web pour H24 --------
require("./server");

// -------- 8) Login --------
client.login(process.env.TOKEN);