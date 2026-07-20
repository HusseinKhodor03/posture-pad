import { createServer } from "http";
import path from "path";
import url from "url";
import { createServerApp } from "./src/app/server-app.js";
import {
  DEFAULT_HTTP_PORT,
  DEFAULT_TCP_PORT,
  FRONTEND_PUBLIC_PATH,
} from "./src/config/constants.js";
import { TcpSensorServer } from "./src/network/tcp-sensor-server.js";
import { WebSocketHub } from "./src/network/web-socket-hub.js";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, ...FRONTEND_PUBLIC_PATH);

const httpPort = process.env.PORT || DEFAULT_HTTP_PORT;
const tcpPort = process.env.TCP_PORT || DEFAULT_TCP_PORT;
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
