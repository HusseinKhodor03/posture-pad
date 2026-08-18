const LOCAL_WEBSOCKET_URL = "ws://localhost:3000/ws";
const RAILWAY_WEBSOCKET_URL =
  "wss://posture-pad-production.up.railway.app/ws";

export class DashboardWebSocket {
  constructor(onDashboardUpdate) {
    this.onDashboardUpdate = onDashboardUpdate;
    this.selectedDeviceId = null;
    this.authToken = "";
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

      if (message.type === "authorization_status") {
        if (message.status !== "authorized") {
          this.deviceStatus = "offline";
          this.onDashboardUpdate({ status: "offline" });
        }

        return;
      }

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

    if (
      !this.selectedDeviceId ||
      !this.authToken ||
      this.ws?.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    this.ws.send(
      JSON.stringify({
        type: "subscribe",
        device_id: this.selectedDeviceId,
        auth_token: this.authToken,
      }),
    );
  }

  setAuthToken(authToken) {
    this.authToken = authToken;
  }

  clearAuthToken() {
    this.authToken = "";
  }

  unsubscribe() {
    this.deviceStatus = "offline";

    if (this.ws?.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(
      JSON.stringify({
        type: "unsubscribe",
      }),
    );
  }
}
