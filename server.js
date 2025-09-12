// server.js
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("✅ Le bot est actif !");
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🌐 Serveur web actif sur le port ${PORT}`);
});