import { RAILWAY_WEBSOCKET_URL } from "../config/constants.js";

export class DashboardWebSocket {
  constructor(onSensorData) {
    this.onSensorData = onSensorData;
    this.selectedDeviceId = null;
    this.ws = null;
  }

  connect() {
    const isLocal = ["localhost", "127.0.0.1"].includes(
      window.location.hostname,
    );
    const url = isLocal ? "ws://localhost:3000/ws" : RAILWAY_WEBSOCKET_URL;

    this.ws = new WebSocket(url);

    this.ws.addEventListener("open", () => {
      this.subscribeToDevice();
    });

    this.ws.addEventListener("message", (event) => {
      this.onSensorData(JSON.parse(event.data));
    });
  }

  subscribeToDevice(deviceId = this.selectedDeviceId) {
    this.selectedDeviceId = deviceId;

    if (!this.selectedDeviceId || this.ws?.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(
      JSON.stringify({
        type: "subscribe",
        device_id: this.selectedDeviceId,
      }),
    );
  }
}
