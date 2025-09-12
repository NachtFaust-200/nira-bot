const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fun-morpion")
    .setDescription("Jouez contre un adversaire aux Morpion")
    .addUserOption(option =>
      option.setName("adversaire")
        .setDescription("Choisissez un adversaire")
        .setRequired(true)),

  async execute(interaction) {
    const player1 = interaction.user;
    const player2 = interaction.options.getUser("adversaire");

    if (player1.id === player2.id) {
      return interaction.reply("❌ Tu ne peux pas jouer contre toi-même !");
    }

    // Plateau 3x3 vide
    let board = Array(9).fill(" ");
    let currentPlayer = player1;

    const createBoard = () => {
      return [
        new ActionRowBuilder().addComponents(
          board.slice(0, 3).map((v, i) => new ButtonBuilder()
            .setCustomId(`morpion_${i}`)
            .setLabel(v)
            .setStyle(v === " " ? ButtonStyle.Secondary : (v === "X" ? ButtonStyle.Danger : ButtonStyle.Primary))
            .setDisabled(v !== " ")
          )
        ),
        new ActionRowBuilder().addComponents(
          board.slice(3, 6).map((v, i) => new ButtonBuilder()
            .setCustomId(`morpion_${i + 3}`)
            .setLabel(v)
            .setStyle(v === " " ? ButtonStyle.Secondary : (v === "X" ? ButtonStyle.Danger : ButtonStyle.Primary))
            .setDisabled(v !== " ")
          )
        ),
        new ActionRowBuilder().addComponents(
          board.slice(6, 9).map((v, i) => new ButtonBuilder()
            .setCustomId(`morpion_${i + 6}`)
            .setLabel(v)
            .setStyle(v === " " ? ButtonStyle.Secondary : (v === "X" ? ButtonStyle.Danger : ButtonStyle.Primary))
            .setDisabled(v !== " ")
          )
        )
      ];
    };

    const message = await interaction.reply({
      content: `🎮 Morpion lancé entre ${player1} (❌) et ${player2} (⭕)\nTour de ${currentPlayer}`,
      components: createBoard(),
      fetchReply: true
    });

    const collector = message.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async i => {
      if (i.user.id !== currentPlayer.id) {
        return i.reply({ content: "❌ Ce n'est pas ton tour !", ephemeral: true });
      }

      const index = parseInt(i.customId.split("_")[1]);
      if (board[index] !== " ") {
        return i.reply({ content: "❌ Case déjà prise !", ephemeral: true });
      }

      board[index] = currentPlayer.id === player1.id ? "X" : "O";

      const winner = checkWinner(board);
      if (winner) {
        collector.stop();
        return i.update({
          content: `🎉 ${currentPlayer} a gagné la partie !`,
          components: createBoard()
        });
      }

      if (!board.includes(" ")) {
        collector.stop();
        return i.update({
          content: "🤝 Match nul !",
          components: createBoard()
        });
      }

      currentPlayer = currentPlayer.id === player1.id ? player2 : player1;
      await i.update({
        content: `🎮 Tour de ${currentPlayer}`,
        components: createBoard()
      });
    });

    function checkWinner(b) {
      const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // lignes
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // colonnes
        [0, 4, 8], [2, 4, 6]              // diagonales
      ];
      return winPatterns.some(pattern =>
        b[pattern[0]] !== " " &&
        b[pattern[0]] === b[pattern[1]] &&
        b[pattern[1]] === b[pattern[2]]
      );
    }
  },
};