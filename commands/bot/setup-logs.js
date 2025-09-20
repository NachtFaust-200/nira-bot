const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const DiscordLogger = require("../../utils/discordLogger");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-logs")
    .setDescription("Configure le système de logs Discord")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName("init")
        .setDescription("Initialise le système de logs Discord")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("test")
        .setDescription("Teste le système de logs")
    ),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === "init") {
        await this.handleInit(interaction, client);
      } else if (subcommand === "test") {
        await this.handleTest(interaction, client);
      }
    } catch (error) {
      logger.error("Erreur commande setup-logs", error);
      await interaction.reply({ 
        content: "❌ Une erreur est survenue.", 
        ephemeral: true 
      });
    }
  },

  async handleInit(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ 
        content: "❌ Vous devez être administrateur.", 
        ephemeral: true 
      });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ 
        content: "❌ Je n'ai pas la permission de gérer les salons.", 
        ephemeral: true 
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const discordLogger = new DiscordLogger(client);
      const success = await discordLogger.initialize(interaction.guild);

      if (success) {
        // Stocker l'instance pour ce serveur
        if (!client.discordLoggers) client.discordLoggers = new Map();
        client.discordLoggers.set(interaction.guild.id, discordLogger);

        const embed = new EmbedBuilder()
          .setTitle("✅ Logs Discord Initialisés")
          .setDescription("Le système de logs Discord a été configuré !")
          .setColor("#00FF00")
          .addFields(
            { name: "📊 Catégorie", value: "📊 Logs", inline: true },
            { name: "📝 Salons", value: "4 salons créés", inline: true },
            { name: "🔒 Accès", value: "Administrateurs", inline: true }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        logger.success("Logs Discord initialisés");
      } else {
        const embed = new EmbedBuilder()
          .setTitle("❌ Erreur d'Initialisation")
          .setDescription("Impossible d'initialiser les logs Discord.")
          .setColor("#FF4444")
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      logger.error("Erreur initialisation logs", error);
      
      const embed = new EmbedBuilder()
        .setTitle("❌ Erreur Critique")
        .setDescription("Une erreur inattendue s'est produite.")
        .setColor("#FF0000")
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  },

  async handleTest(interaction, client) {
    const discordLogger = client.discordLoggers?.get(interaction.guild.id);
    
    if (!discordLogger || !discordLogger.isInitialized()) {
      return interaction.reply({ 
        content: "❌ Les logs Discord ne sont pas initialisés. Utilisez `/setup-logs init` d'abord.", 
        ephemeral: true 
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // Test des logs
      await discordLogger.logCommand("test", interaction.user, interaction.guild, true, 100);
      await discordLogger.logEvent("test_event", { test: true });
      await discordLogger.logVoice("A rejoint un salon de test", interaction.user, { name: "Test" });
      
      const embed = new EmbedBuilder()
        .setTitle("🧪 Test des Logs")
        .setDescription("Test effectué avec succès !")
        .setColor("#00FF00")
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      logger.success("Test des logs effectué");

    } catch (error) {
      logger.error("Erreur test logs", error);
      
      const embed = new EmbedBuilder()
        .setTitle("❌ Erreur Test")
        .setDescription("Erreur lors du test des logs.")
        .setColor("#FF4444")
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  }
};