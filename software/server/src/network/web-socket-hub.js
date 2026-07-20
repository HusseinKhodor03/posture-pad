import { WebSocket, WebSocketServer } from "ws";
import { normalizeDeviceId } from "../device/device-id.js";

export class WebSocketHub {
  constructor(httpServer) {
    this.server = new WebSocketServer({ server: httpServer, path: "/ws" });
  }

  init() {
    this.server.on("connection", (ws) => {
      ws.subscribedDeviceId = null;

      ws.on("error", (error) => {
        console.error(error);
      });

      ws.on("message", (data) => {
        this.handleMessage(ws, data);
      });
    });
  }

  handleMessage(ws, data) {
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
  }

  broadcastSensorData(deviceId, sensorData) {
    this.server.clients.forEach((client) => {
      if (
        client.readyState === WebSocket.OPEN &&
        client.subscribedDeviceId === deviceId
      ) {
        client.send(sensorData);
      }
    });
  }
}
