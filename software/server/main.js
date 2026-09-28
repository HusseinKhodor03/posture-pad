import { createServer } from "http";
import path from "path";
import url from "url";
import { createServerApp } from "./src/app/server-app.js";
import { TcpSensorServer } from "./src/network/tcp-sensor-server.js";
import { WebSocketHub } from "./src/network/web-socket-hub.js";

const DEFAULT_HTTP_PORT = 3000;
const DEFAULT_TCP_PORT = 9000;
const STREAM_INACTIVITY_TIMEOUT_MS = 3000;

const HTTP_PORT = process.env.PORT || DEFAULT_HTTP_PORT;
const TCP_PORT = process.env.TCP_PORT || DEFAULT_TCP_PORT;
const FRONTEND_URL = process.env.FRONTEND_URL;

const FRONTEND_PUBLIC_PATH = ["..", "frontend", "public"];

function main() {
  const __filename = url.fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const publicDir = path.join(__dirname, ...FRONTEND_PUBLIC_PATH);

  const serverApp = createServerApp({
    publicDir,
    frontendUrl: FRONTEND_URL,
  });

  const httpServer = createServer(serverApp);
  const webSocketHub = new WebSocketHub(httpServer);
  webSocketHub.init();

  httpServer.listen(HTTP_PORT, "0.0.0.0");

  const tcpSensorServer = new TcpSensorServer({
    port: TCP_PORT,
    streamInactivityTimeoutMs: STREAM_INACTIVITY_TIMEOUT_MS,
    onSensorData: (deviceId, sensorData) => {
      webSocketHub.broadcastSensorData(deviceId, sensorData);
    },
    onDeviceStatus: (deviceId, status) => {
      webSocketHub.broadcastDeviceStatus(deviceId, status);
    },
    onDeviceAuthToken: (deviceId, authToken) => {
      webSocketHub.setDeviceAuthToken(deviceId, authToken);
    },
  });
  tcpSensorServer.listen();
}

main();
