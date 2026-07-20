import net from "net";
import { normalizeDeviceId } from "../device/device-id.js";

export class TcpSensorServer {
  constructor({ port, onSensorData }) {
    this.port = port;
    this.onSensorData = onSensorData;
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

        this.handleLine(line);

        boundary = buffer.indexOf("\n");
      }
    });

    socket.on("close", () => console.log("ESP32 disconnected"));
    socket.on("error", (err) => console.error("TCP socket error:", err));
  }

  handleLine(line) {
    if (!line) {
      return;
    }

    try {
      const sensorData = JSON.parse(line);
      const deviceId = normalizeDeviceId(sensorData?.device_id);

      if (deviceId) {
        this.onSensorData(deviceId, line);
      }
    } catch (error) {
      console.error("Invalid sensor data:", error);
    }
  }
}
