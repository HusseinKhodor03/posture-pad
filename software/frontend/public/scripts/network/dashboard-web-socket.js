import {
  LOCAL_WEBSOCKET_URL,
  RAILWAY_WEBSOCKET_URL,
} from "../config/constants.js";

export class DashboardWebSocket {
  constructor(onDashboardUpdate) {
    this.onDashboardUpdate = onDashboardUpdate;
    this.selectedDeviceId = null;
    this.deviceStatus = "offline";
    this.ws = null;
  }

  connect() {
    const isLocal = ["localhost", "127.0.0.1"].includes(
      window.location.hostname,
    );
    const url = isLocal ? LOCAL_WEBSOCKET_URL : RAILWAY_WEBSOCKET_URL;

    this.ws = new WebSocket(url);

    this.ws.addEventListener("open", () => {
      this.subscribeToDevice();
    });

    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "device_status") {
        this.deviceStatus = message.status;

        if (this.deviceStatus === "offline") {
          this.onDashboardUpdate({ status: "offline" });
        }

        return;
      }

      if (this.deviceStatus !== "online") {
        return;
      }

      this.onDashboardUpdate({
        status: "online",
        data: message,
      });
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
