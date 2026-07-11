import express from "express";
import path from "path";
import url from "url";
import { WebSocket, WebSocketServer } from "ws";
import net from "net";

const DEVICE_ID_PATTERN = /^[0-9A-F]{12}$/;

function normalizeDeviceId(deviceId) {
  if (typeof deviceId !== "string") return null;

  const normalizedDeviceId = deviceId.toUpperCase();
  return DEVICE_ID_PATTERN.test(normalizedDeviceId)
    ? normalizedDeviceId
    : null;
}

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = express();
const port = 3000;
const ws_port = 8080;
const tcp_port = 9000;

server.use(express.static(path.join(__dirname, "public")));

server.use((req, res) => {
  res.status(404);
  res.send(`<h1>Error 404: Resource not found!</h1>`);
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

const wss = new WebSocketServer({ port: ws_port });

wss.on("listening", () => {
  console.log(`WebSocket server running on port ${ws_port}`);
});

wss.on("connection", (ws) => {
  ws.subscribedDeviceId = null;

  ws.on("error", (error) => {
    console.error(error);
  });

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      const deviceId = normalizeDeviceId(message?.device_id);

      if (message.type !== "subscribe" || !deviceId) {
        return;
      }

      ws.subscribedDeviceId = deviceId;
      console.log(`Dashboard subscribed to device ${deviceId}`);
    } catch (error) {
      console.error("Invalid WebSocket message:", error);
    }
  });
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
            wss.clients.forEach((client) => {
              if (
                client.readyState === WebSocket.OPEN &&
                client.subscribedDeviceId === deviceId
              ) {
                client.send(line);
              }
            });
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

tcpServer.listen(tcp_port, () => {
  console.log(`TCP server listening on port ${tcp_port}`);
});
