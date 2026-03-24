const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = Number(process.env.DASHBOARD_PORT || 3000);
const host = process.env.DASHBOARD_BIND || "127.0.0.1";

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "zoombot", status: "bootstrapped" });
});

app.listen(port, host, () => {
  console.log(`ZoomBot starter server running at http://${host}:${port}`);
});
