import express from "express";
import { createServer } from "http";
import path from "path";
import url from "url";
import net from "net";
import { normalizeDeviceId } from "./src/device/device-id.js";
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

const tcpServer = net.createServer((socket) => {
  console.log("ESP32 connected!");

  let buffer = "";

  socket.on("data", (chunk) => {
    buffer += chunk.toString();

    let boundary = buffer.indexOf("\n");
    while (boundary !== -1) {
      const line = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 1);

      if (line) {
        try {
          const sensorData = JSON.parse(line);
          const deviceId = normalizeDeviceId(sensorData?.device_id);

          if (deviceId) {
            webSocketHub.broadcastSensorData(deviceId, line);
          }
        } catch (error) {
          console.error("Invalid sensor data:", error);
        }
      }

      boundary = buffer.indexOf("\n");
    }
  });

  socket.on("close", () => console.log("ESP32 disconnected"));
  socket.on("error", (err) => console.error("TCP socket error:", err));
});

tcpServer.listen(tcpPort, "0.0.0.0", () => {
  console.log(`TCP server listening on port ${tcpPort}`);
});
