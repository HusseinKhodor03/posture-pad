import { createServer } from "http";
import path from "path";
import url from "url";
import { createServerApp } from "./src/app/server-app.js";
import {
  FRONTEND_PUBLIC_PATH,
  FRONTEND_URL,
  HTTP_PORT,
  TCP_PORT,
} from "./src/config/constants.js";
import { TcpSensorServer } from "./src/network/tcp-sensor-server.js";
import { WebSocketHub } from "./src/network/web-socket-hub.js";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, ...FRONTEND_PUBLIC_PATH);

const app = createServerApp({
  publicDir,
  frontendUrl: FRONTEND_URL,
});

const httpServer = createServer(app);
const webSocketHub = new WebSocketHub(httpServer);
webSocketHub.init();

httpServer.listen(HTTP_PORT, "0.0.0.0", () => {
  console.log(`HTTP and WebSocket server listening on port ${HTTP_PORT}`);
});

const tcpSensorServer = new TcpSensorServer({
  port: TCP_PORT,
  onSensorData: (deviceId, sensorData) => {
    webSocketHub.broadcastSensorData(deviceId, sensorData);
  },
});
tcpSensorServer.listen();
