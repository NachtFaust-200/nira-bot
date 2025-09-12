const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fun-2048")
    .setDescription("Jouez à 2048 dans Discord"),

  async execute(interaction) {
    let grid = Array(4).fill().map(() => Array(4).fill(0));

    function addRandomTile() {
      let empty = [];
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (grid[i][j] === 0) empty.push([i, j]);
        }
      }
      if (empty.length) {
        const [x, y] = empty[Math.floor(Math.random() * empty.length)];
        grid[x][y] = Math.random() < 0.9 ? 2 : 4;
      }
    }

    function renderGrid() {
      return grid.map(r => r.map(c => (c === 0 ? "⬜" : `**${c}**`)).join(" ")).join("\n");
    }

    function transpose(matrix) {
      return matrix[0].map((_, i) => matrix.map(row => row[i]));
    }

    function reverse(matrix) {
      return matrix.map(row => [...row].reverse());
    }

    function compressAndMerge(row) {
      row = row.filter(n => n !== 0);
      for (let j = 0; j < row.length - 1; j++) {
        if (row[j] === row[j + 1]) {
          row[j] *= 2;
          row[j + 1] = 0;
        }
      }
      row = row.filter(n => n !== 0);
      while (row.length < 4) row.push(0);
      return row;
    }

    function moveLeft() {
      grid = grid.map(row => compressAndMerge(row));
      addRandomTile();
    }

    function moveRight() {
      grid = grid.map(row => compressAndMerge(row.reverse()).reverse());
      addRandomTile();
    }

    function moveUp() {
      grid = transpose(grid);
      grid = grid.map(row => compressAndMerge(row));
      grid = transpose(grid);
      addRandomTile();
    }

    function moveDown() {
      grid = transpose(grid);
      grid = grid.map(row => compressAndMerge(row.reverse()).reverse());
      grid = transpose(grid);
      addRandomTile();
    }

    addRandomTile();
    addRandomTile();

    const controls = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("left").setLabel("⬅️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("up").setLabel("⬆️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("down").setLabel("⬇️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("right").setLabel("➡️").setStyle(ButtonStyle.Primary)
    );

    const message = await interaction.reply({
      content: `🎮 **2048**\n${renderGrid()}`,
      components: [controls],
      fetchReply: true
    });

    const collector = message.createMessageComponentCollector({ time: 300000 }); // 5 min

    collector.on("collect", async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: "❌ Tu n'es pas dans cette partie", ephemeral: true });
      }

      if (i.customId === "left") moveLeft();
      if (i.customId === "right") moveRight();
      if (i.customId === "up") moveUp();
      if (i.customId === "down") moveDown();

      await i.update({ content: `🎮 **2048**\n${renderGrid()}`, components: [controls] });
    });

    collector.on("end", async () => {
      await message.edit({ content: `🎮 **2048 terminé**\n${renderGrid()}`, components: [] });
    });
  },
};