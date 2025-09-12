const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fun-divine_nombre")
    .setDescription("Devinez le nombre caché entre 0 et 1000"),

  async execute(interaction) {
    const number = Math.floor(Math.random() * 1001);
    await interaction.reply("🔢 J'ai choisi un nombre entre 0 et 1000. Tapez vos essais dans le chat !");

    const filter = m => !isNaN(m.content) && !m.author.bot;
    const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });

    collector.on("collect", m => {
      const guess = parseInt(m.content);
      if (guess === number) {
        m.reply(`🎉 Bravo ${m.author}, tu as trouvé le nombre !`);
        collector.stop();
      } else if (guess < number) {
        m.reply("⬆️ Plus grand !");
      } else {
        m.reply("⬇️ Plus petit !");
      }
    });

    collector.on("end", collected => {
      if (![...collected].some(m => parseInt(m.content) === number)) {
        interaction.followUp(`⏰ Temps écoulé ! Le nombre était ${number}.`);
      }
    });
  },
};