import express from "express";
import { createServer } from "http";
import path from "path";
import url from "url";
import { TcpSensorServer } from "./src/network/tcp-sensor-server.js";
import { WebSocketHub } from "./src/network/web-socket-hub.js";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "frontend", "public");

const app = express();
const httpPort = process.env.PORT || 3000;
const tcpPort = process.env.TCP_PORT || 9000;
const frontendUrl = process.env.FRONTEND_URL;

app.get("/", (req, res, next) => {
  if (!frontendUrl) {
    next();
    return;
  }

  res.redirect(302, frontendUrl);
});

app.use(express.static(publicDir));

app.use((req, res) => {
  res.status(404);
  res.send(`<h1>Error 404: Resource not found!</h1>`);
});

const httpServer = createServer(app);
const webSocketHub = new WebSocketHub(httpServer);
webSocketHub.init();

httpServer.listen(httpPort, "0.0.0.0", () => {
  console.log(`HTTP and WebSocket server listening on port ${httpPort}`);
});

const tcpSensorServer = new TcpSensorServer({
  port: tcpPort,
  onSensorData: (deviceId, sensorData) => {
    webSocketHub.broadcastSensorData(deviceId, sensorData);
  },
});
tcpSensorServer.listen();
