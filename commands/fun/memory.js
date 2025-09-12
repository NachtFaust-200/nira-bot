const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fun-memory")
    .setDescription("Jouez à un jeu de mémoire en trouvant les paires !"),

  async execute(interaction) {
    const emojis = ["🍎", "🍌", "🍇", "🍒"];
    let board = [...emojis, ...emojis].sort(() => Math.random() - 0.5).map(() => "❓");
    let revealed = Array(8).fill(false);

    const createBoard = () => {
      const buttons = board.map((v, i) =>
        new ButtonBuilder()
          .setCustomId(`memory_${i}`)
          .setLabel(v)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(revealed[i])
      );

      return [
        new ActionRowBuilder().addComponents(buttons.slice(0, 4)),
        new ActionRowBuilder().addComponents(buttons.slice(4, 8))
      ];
    };

    const message = await interaction.reply({
      content: "🧠 Jeu de mémoire : trouve toutes les paires !",
      components: createBoard(),
      fetchReply: true
    });

    let firstChoice = null;

    const collector = message.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async i => {
      const index = parseInt(i.customId.split("_")[1]);

      if (revealed[index]) {
        return i.reply({ content: "❌ Déjà trouvé !", ephemeral: true });
      }

      board[index] = emojis.concat(emojis).sort()[index];
      await i.update({ components: createBoard() });

      if (firstChoice === null) {
        firstChoice = index;
      } else {
        const emoji1 = emojis.concat(emojis).sort()[firstChoice];
        const emoji2 = emojis.concat(emojis).sort()[index];

        if (emoji1 === emoji2) {
          revealed[firstChoice] = true;
          revealed[index] = true;
        } else {
          setTimeout(() => {
            board[firstChoice] = "❓";
            board[index] = "❓";
            message.edit({ components: createBoard() });
          }, 1000);
        }
        firstChoice = null;
      }

      if (revealed.every(v => v)) {
        collector.stop();
        return interaction.followUp("🎉 Bravo ! Tu as trouvé toutes les paires !");
      }
    });
  },
};