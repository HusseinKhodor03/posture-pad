import { DashboardWebSocket } from "./dashboard-web-socket.js";
import { FootHeatmaps } from "./foot-heatmaps.js";
import { updateDashboardStatusView } from "./dashboard-status-view.js";

export class DashboardController {
  constructor({ deviceLabel, onObservedWifiSsidChanged } = {}) {
    this.deviceId = null;
    this.deviceLabel = deviceLabel;
    this.status = "offline";
    this.isPaused = false;
    this.observedWifiSsid = "";
    this.onObservedWifiSsidChanged = onObservedWifiSsidChanged;
    this.footHeatmaps = new FootHeatmaps();
    this.dashboardWebSocket = new DashboardWebSocket((dashboardState) => {
      this.handleDashboardUpdate(dashboardState);
    });

    this.render();
  }

  connect() {
    this.dashboardWebSocket.subscribeToDevice(this.deviceId);
    this.dashboardWebSocket.connect();
  }

  initHeatmaps() {
    return this.footHeatmaps.init();
  }

  startHeatmapDrawLoop() {
    this.footHeatmaps.startDrawLoop();
  }

  setDevice({ deviceId, deviceLabel, preserveStatus = false }) {
    this.deviceId = deviceId;
    this.deviceLabel = deviceLabel;

    if (!preserveStatus) {
      this.status = "offline";
    }

    this.dashboardWebSocket.subscribeToDevice(this.deviceId);
    this.render();
  }

  clearDevice({ deviceLabel } = {}) {
    this.deviceId = null;
    this.deviceLabel = deviceLabel;
    this.dashboardWebSocket.unsubscribe();
    this.reset();
  }

  setAuthToken(authToken) {
    this.dashboardWebSocket.setAuthToken(authToken);
  }

  clearAuthToken() {
    this.dashboardWebSocket.clearAuthToken();
  }

  setPaused(isPaused) {
    this.isPaused = isPaused;
    this.render();
  }

  reset({ deviceLabel } = {}) {
    if (deviceLabel !== undefined) {
      this.deviceLabel = deviceLabel;
    }

    this.status = "offline";
    this.observedWifiSsid = "";
    this.footHeatmaps.reset();
    this.render();
  }

  getStatus() {
    return this.status;
  }

  getObservedWifiSsid() {
    return this.observedWifiSsid;
  }

  handleDashboardUpdate(dashboardState) {
    this.status = dashboardState.status;
    let observedWifiSsid = null;

    if (dashboardState.data) {
      observedWifiSsid = dashboardState.data.wifi_ssid || "";
      this.observedWifiSsid = observedWifiSsid;
      this.footHeatmaps.updateFromDashboardData(dashboardState.data);
    } else if (dashboardState.status === "offline" && !this.isPaused) {
      this.footHeatmaps.reset();
    }

    this.render(dashboardState);

    if (observedWifiSsid !== null) {
      this.onObservedWifiSsidChanged?.(observedWifiSsid);
    }
  }

  render(dashboardState = {}) {
    updateDashboardStatusView({
      ...dashboardState,
      status: dashboardState.status || this.status,
      deviceLabel: this.deviceLabel,
      isPaused: this.isPaused,
    });
  }
}
