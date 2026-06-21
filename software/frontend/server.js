import express from "express";
import path from "path";
import url from "url";
import { WebSocketServer } from "ws";
import net from "net";

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
  ws.on("error", (error) => {
    console.error(error);
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
        wss.clients.forEach((client) => {
          if (client.readyState === client.OPEN) {
            client.send(line);
          }
        });
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
