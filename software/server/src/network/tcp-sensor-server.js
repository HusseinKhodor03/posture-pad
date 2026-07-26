import net from "net";
import { normalizeDeviceId } from "../device/device-id.js";

export class TcpSensorServer {
  constructor({
    port,
    streamInactivityTimeoutMs,
    onSensorData,
    onDeviceStatus,
  }) {
    this.port = port;
    this.streamInactivityTimeoutMs = streamInactivityTimeoutMs;
    this.onSensorData = onSensorData;
    this.onDeviceStatus = onDeviceStatus;
    this.activeSocketsByDeviceId = new Map();
    this.inactivityTimersByDeviceId = new Map();
    this.server = net.createServer((socket) => {
      this.handleConnection(socket);
    });
  }

  listen() {
    this.server.listen(this.port, "0.0.0.0", () => {
      console.log(`TCP server listening on port ${this.port}`);
    });
  }

  handleConnection(socket) {
    console.log("ESP32 connected!");

    let buffer = "";

    socket.on("data", (chunk) => {
      buffer += chunk.toString();

      let boundary = buffer.indexOf("\n");
      while (boundary !== -1) {
        const line = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 1);

        this.handleLine(line, socket);

        boundary = buffer.indexOf("\n");
      }
    });

    socket.on("close", () => {
      console.log("ESP32 disconnected");
      this.handleDisconnection(socket);
    });
    socket.on("error", (err) => console.error("TCP socket error:", err));
  }

  handleLine(line, socket) {
    if (!line) {
      return;
    }

    try {
      const sensorData = JSON.parse(line);
      const deviceId = normalizeDeviceId(sensorData?.device_id);

      if (deviceId) {
        this.registerSocketDevice(socket, deviceId);
        this.resetInactivityTimer(socket, deviceId);
        this.onSensorData(deviceId, line);
      }
    } catch (error) {
      console.error("Invalid sensor data:", error);
    }
  }

  registerSocketDevice(socket, deviceId) {
    if (this.activeSocketsByDeviceId.get(deviceId) === socket) {
      return;
    }

    socket.deviceId = deviceId;
    this.activeSocketsByDeviceId.set(deviceId, socket);
    this.onDeviceStatus(deviceId, "online");
  }

  resetInactivityTimer(socket, deviceId) {
    this.clearInactivityTimer(deviceId);

    const timer = setTimeout(() => {
      this.handleInactivity(socket);
    }, this.streamInactivityTimeoutMs);

    timer.unref?.();
    this.inactivityTimersByDeviceId.set(deviceId, timer);
  }

  handleDisconnection(socket) {
    const deviceId = socket.deviceId;

    if (!deviceId || this.activeSocketsByDeviceId.get(deviceId) !== socket) {
      return;
    }

    this.activeSocketsByDeviceId.delete(deviceId);
    this.clearInactivityTimer(deviceId);
    this.onDeviceStatus(deviceId, "offline");
  }

  handleInactivity(socket) {
    const deviceId = socket.deviceId;

    if (!deviceId || this.activeSocketsByDeviceId.get(deviceId) !== socket) {
      return;
    }

    console.log(`ESP32 stream inactive for device ${deviceId}`);
    this.activeSocketsByDeviceId.delete(deviceId);
    this.clearInactivityTimer(deviceId);
    this.onDeviceStatus(deviceId, "offline");
  }

  clearInactivityTimer(deviceId) {
    const timer = this.inactivityTimersByDeviceId.get(deviceId);

    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.inactivityTimersByDeviceId.delete(deviceId);
  }
}
