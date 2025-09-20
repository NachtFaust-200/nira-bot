const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("2048")
    .setDescription("Joue au célèbre jeu 2048 dans Discord ! 🎮"),

  async execute(interaction) {
    let grid = Array(4).fill().map(() => Array(4).fill(0));
    let score = 0;
    let moves = 0;
    let gameOver = false;

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
      return grid.map(r => r.map(c => {
        if (c === 0) return "⬜";
        const colors = {
          2: "🔵", 4: "🟢", 8: "🟡", 16: "🟠", 32: "🔴", 64: "🟣", 
          128: "🟤", 256: "⚫", 512: "⚪", 1024: "🟫", 2048: "🏆"
        };
        return colors[c] || `**${c}**`;
      }).join(" ")).join("\n");
    }

    function transpose(matrix) {
      return matrix[0].map((_, i) => matrix.map(row => row[i]));
    }

    function reverse(matrix) {
      return matrix.map(row => [...row].reverse());
    }

    function compressAndMerge(row) {
      const originalRow = [...row];
      row = row.filter(n => n !== 0);
      for (let j = 0; j < row.length - 1; j++) {
        if (row[j] === row[j + 1]) {
          row[j] *= 2;
          score += row[j];
          row[j + 1] = 0;
        }
      }
      row = row.filter(n => n !== 0);
      while (row.length < 4) row.push(0);
      return row;
    }

    function moveLeft() {
      const oldGrid = grid.map(row => [...row]);
      grid = grid.map(row => compressAndMerge(row));
      if (JSON.stringify(oldGrid) !== JSON.stringify(grid)) {
        addRandomTile();
        moves++;
      }
    }

    function moveRight() {
      const oldGrid = grid.map(row => [...row]);
      grid = grid.map(row => compressAndMerge(row.reverse()).reverse());
      if (JSON.stringify(oldGrid) !== JSON.stringify(grid)) {
        addRandomTile();
        moves++;
      }
    }

    function moveUp() {
      const oldGrid = grid.map(row => [...row]);
      grid = transpose(grid);
      grid = grid.map(row => compressAndMerge(row));
      grid = transpose(grid);
      if (JSON.stringify(oldGrid) !== JSON.stringify(grid)) {
        addRandomTile();
        moves++;
      }
    }

    function moveDown() {
      const oldGrid = grid.map(row => [...row]);
      grid = transpose(grid);
      grid = grid.map(row => compressAndMerge(row.reverse()).reverse());
      grid = transpose(grid);
      if (JSON.stringify(oldGrid) !== JSON.stringify(grid)) {
        addRandomTile();
        moves++;
      }
    }

    function checkGameOver() {
      // Vérifie s'il y a des cases vides
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (grid[i][j] === 0) return false;
        }
      }
      
      // Vérifie les fusions possibles
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (i < 3 && grid[i][j] === grid[i + 1][j]) return false;
          if (j < 3 && grid[i][j] === grid[i][j + 1]) return false;
        }
      }
      
      return true;
    }

    function getHighestTile() {
      let highest = 0;
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (grid[i][j] > highest) highest = grid[i][j];
        }
      }
      return highest;
    }

    addRandomTile();
    addRandomTile();

    const controls = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("left").setLabel("⬅️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("up").setLabel("⬆️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("down").setLabel("⬇️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("right").setLabel("➡️").setStyle(ButtonStyle.Primary)
    );

    const stopButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("stop").setLabel("⏹️ Arrêter").setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setTitle("🎮 2048 - Jeu en cours")
      .setDescription(`\`\`\`\n${renderGrid()}\n\`\`\``)
      .setColor("#FF6B6B")
      .addFields(
        { name: "🏆 Score", value: score.toString(), inline: true },
        { name: "🎯 Mouvements", value: moves.toString(), inline: true },
        { name: "🔢 Plus haute tuile", value: getHighestTile().toString(), inline: true }
      )
      .setFooter({ text: `Joueur: ${interaction.user.username} • Utilisez les flèches pour jouer !` })
      .setTimestamp();

    const message = await interaction.reply({
      embeds: [embed],
      components: [controls, stopButton],
      fetchReply: true
    });

    const collector = message.createMessageComponentCollector({ time: 600000 }); // 10 min

    collector.on("collect", async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: "❌ Tu n'es pas dans cette partie", ephemeral: true });
      }

      if (i.customId === "stop") {
        gameOver = true;
        collector.stop();
        return;
      }

      if (gameOver) return;

      if (i.customId === "left") moveLeft();
      if (i.customId === "right") moveRight();
      if (i.customId === "up") moveUp();
      if (i.customId === "down") moveDown();

      const highest = getHighestTile();
      const isWin = highest >= 2048;
      const isGameOver = checkGameOver();

      if (isWin && !gameOver) {
        gameOver = true;
        const winEmbed = new EmbedBuilder()
          .setTitle("🎉 Félicitations ! Tu as gagné !")
          .setDescription(`\`\`\`\n${renderGrid()}\n\`\`\``)
          .setColor("#00FF00")
          .addFields(
            { name: "🏆 Score final", value: score.toString(), inline: true },
            { name: "🎯 Mouvements", value: moves.toString(), inline: true },
            { name: "🔢 Plus haute tuile", value: highest.toString(), inline: true },
            { name: "🎊 Statut", value: "VICTOIRE !", inline: false }
          )
          .setFooter({ text: `Félicitations ${interaction.user.username} !` })
          .setTimestamp();

        await i.update({ embeds: [winEmbed], components: [] });
        collector.stop();
        return;
      }

      if (isGameOver && !gameOver) {
        gameOver = true;
        const loseEmbed = new EmbedBuilder()
          .setTitle("💀 Game Over !")
          .setDescription(`\`\`\`\n${renderGrid()}\n\`\`\``)
          .setColor("#FF0000")
          .addFields(
            { name: "🏆 Score final", value: score.toString(), inline: true },
            { name: "🎯 Mouvements", value: moves.toString(), inline: true },
            { name: "🔢 Plus haute tuile", value: highest.toString(), inline: true },
            { name: "💀 Statut", value: "DÉFAITE", inline: false }
          )
          .setFooter({ text: `Bonne chance pour la prochaine fois ${interaction.user.username} !` })
          .setTimestamp();

        await i.update({ embeds: [loseEmbed], components: [] });
        collector.stop();
        return;
      }

      const updateEmbed = new EmbedBuilder()
        .setTitle("🎮 2048 - Jeu en cours")
        .setDescription(`\`\`\`\n${renderGrid()}\n\`\`\``)
        .setColor("#FF6B6B")
        .addFields(
          { name: "🏆 Score", value: score.toString(), inline: true },
          { name: "🎯 Mouvements", value: moves.toString(), inline: true },
          { name: "🔢 Plus haute tuile", value: getHighestTile().toString(), inline: true }
        )
        .setFooter({ text: `Joueur: ${interaction.user.username} • Utilisez les flèches pour jouer !` })
        .setTimestamp();

      await i.update({ embeds: [updateEmbed], components: [controls, stopButton] });
    });

    collector.on("end", async () => {
      if (!gameOver) {
        const timeoutEmbed = new EmbedBuilder()
          .setTitle("⏰ Temps écoulé !")
          .setDescription(`\`\`\`\n${renderGrid()}\n\`\`\``)
          .setColor("#FFA500")
          .addFields(
            { name: "🏆 Score final", value: score.toString(), inline: true },
            { name: "🎯 Mouvements", value: moves.toString(), inline: true },
            { name: "🔢 Plus haute tuile", value: getHighestTile().toString(), inline: true }
          )
          .setFooter({ text: "Partie terminée par timeout" })
          .setTimestamp();

        await message.edit({ embeds: [timeoutEmbed], components: [] });
      }
    });
  },
};