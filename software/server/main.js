import { createServer } from "http";
import path from "path";
import url from "url";
import { createServerApp } from "./src/app/server-app.js";
import { TcpSensorServer } from "./src/network/tcp-sensor-server.js";
import { WebSocketHub } from "./src/network/web-socket-hub.js";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "frontend", "public");

const httpPort = process.env.PORT || 3000;
const tcpPort = process.env.TCP_PORT || 9000;
const frontendUrl = process.env.FRONTEND_URL;

const app = createServerApp({
  publicDir,
  frontendUrl,
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
