import { WebSocket, WebSocketServer } from "ws";
import { normalizeDeviceId } from "../device/device-id.js";

export class WebSocketHub {
  constructor(httpServer) {
    this.server = new WebSocketServer({ server: httpServer, path: "/ws" });
    this.deviceStatuses = new Map();
    this.deviceAuthTokens = new Map();
  }

  init() {
    this.server.on("connection", (ws) => {
      ws.subscribedDeviceId = null;
      ws.requestedDeviceId = null;
      ws.authToken = "";

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

      if (message.type === "unsubscribe") {
        ws.subscribedDeviceId = null;
        ws.requestedDeviceId = null;
        ws.authToken = "";
        return;
      }

      if (message.type !== "subscribe" || !deviceId) {
        return;
      }

      ws.requestedDeviceId = deviceId;
      ws.authToken =
        typeof message.auth_token === "string" ? message.auth_token : "";
      this.authorizeSubscription(ws);
    } catch (error) {
      console.error("Invalid WebSocket message:", error);
    }
  }

  setDeviceAuthToken(deviceId, authToken) {
    this.deviceAuthTokens.set(deviceId, authToken);

    this.server.clients.forEach((client) => {
      if (
        client.readyState === WebSocket.OPEN &&
        client.requestedDeviceId === deviceId &&
        client.subscribedDeviceId !== deviceId
      ) {
        this.authorizeSubscription(client);
      } else if (
        client.readyState === WebSocket.OPEN &&
        client.subscribedDeviceId === deviceId &&
        client.authToken !== authToken
      ) {
        client.subscribedDeviceId = null;
        this.sendAuthorizationStatus(client, deviceId, "unauthorized");
      }
    });
  }

  authorizeSubscription(ws) {
    const expectedToken = this.deviceAuthTokens.get(ws.requestedDeviceId);

    if (!expectedToken) {
      this.sendAuthorizationStatus(ws, ws.requestedDeviceId, "pending");
      return;
    }

    if (ws.authToken !== expectedToken) {
      ws.subscribedDeviceId = null;
      this.sendAuthorizationStatus(ws, ws.requestedDeviceId, "unauthorized");
      return;
    }

    ws.subscribedDeviceId = ws.requestedDeviceId;
    this.sendAuthorizationStatus(ws, ws.subscribedDeviceId, "authorized");
    console.log(`Dashboard subscribed to device ${ws.subscribedDeviceId}`);
    this.sendDeviceStatus(ws, ws.subscribedDeviceId);
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

  broadcastDeviceStatus(deviceId, status) {
    this.deviceStatuses.set(deviceId, status);

    this.server.clients.forEach((client) => {
      if (
        client.readyState === WebSocket.OPEN &&
        client.subscribedDeviceId === deviceId
      ) {
        this.sendDeviceStatus(client, deviceId);
      }
    });
  }

  sendDeviceStatus(client, deviceId) {
    const status = this.deviceStatuses.get(deviceId) ?? "offline";

    client.send(
      JSON.stringify({
        type: "device_status",
        device_id: deviceId,
        status,
      }),
    );
  }

  sendAuthorizationStatus(client, deviceId, status) {
    client.send(
      JSON.stringify({
        type: "authorization_status",
        device_id: deviceId,
        status,
      }),
    );
  }
}
