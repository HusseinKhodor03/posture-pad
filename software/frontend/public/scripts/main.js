import {
  LEFT_FOOT_SVG,
  LEFT_SENSOR_CONFIG,
  PRESSURE_GRADIENT,
  RIGHT_FOOT_SVG,
  RIGHT_SENSOR_CONFIG,
  TAB_HASHES,
} from "./config/constants.js";
import {
  clearSelectedDevice,
  formatDeviceLabel,
  loadSelectedDeviceId,
  selectDevice,
} from "./device/device-selection.js";
import { initTabs } from "./ui/tab-controller.js";
import {
  updateDashboardView,
} from "./ui/dashboard-view.js";
import { updateConfigView } from "./ui/config-view.js";
import { HeatmapRenderer } from "./ui/heatmap-renderer.js";
import { DeviceSetupController } from "./device/device-setup-controller.js";
import { DashboardWebSocket } from "./network/dashboard-web-socket.js";

function main() {
  if (loadSelectedDeviceId()) {
    clearSelectedDevice();
  }

  let selectedDeviceId = null;
  let selectedDeviceLabel = formatDeviceLabel(selectedDeviceId);
  let selectedDeviceStatus = "offline";
  let selectedDeviceWifiSsid = "";
  let isSetupConnected = false;
  let isScanningWifi = false;
  let heatmapsInitialized = false;

  const leftHeatmap = new HeatmapRenderer({
    containerId: "leftFootContainer",
    svgFile: LEFT_FOOT_SVG,
    sensorConfig: LEFT_SENSOR_CONFIG,
    pressureGradient: PRESSURE_GRADIENT,
  });
  const rightHeatmap = new HeatmapRenderer({
    containerId: "rightFootContainer",
    svgFile: RIGHT_FOOT_SVG,
    sensorConfig: RIGHT_SENSOR_CONFIG,
    pressureGradient: PRESSURE_GRADIENT,
  });

  const initialTabHash = initTabs({
    onTabChange: (activeTabHash) => {
      if (activeTabHash !== TAB_HASHES.dashboard || heatmapsInitialized) {
        return;
      }

      Promise.all([leftHeatmap.init(), rightHeatmap.init()]).finally(() => {
        document
          .getElementById("mainContainer")
          .classList.remove("loadingHeatmaps");
        document.body.classList.remove("appBooting");
      });
      heatmapsInitialized = true;
    },
  });

  if (initialTabHash !== TAB_HASHES.dashboard) {
    document.body.classList.remove("appBooting");
  }

  updateDashboardView({
    status: selectedDeviceStatus,
    deviceLabel: selectedDeviceLabel,
    isPaused: isScanningWifi,
  });
  updateConfigView({
    deviceLabel: selectedDeviceLabel,
    deviceId: selectedDeviceId,
    hasSelectedDevice: Boolean(selectedDeviceId),
    isSetupConnected,
    wifiSsid: selectedDeviceWifiSsid,
  });

  let deviceSetupController = null;

  const dashboardWebSocket = new DashboardWebSocket((dashboardState) => {
    selectedDeviceStatus = dashboardState.status;

    if (dashboardState.data) {
      selectedDeviceWifiSsid = dashboardState.data.wifi_ssid || "";
      leftHeatmap.updateSensorData(dashboardState.data.left_foot.sensors);
      rightHeatmap.updateSensorData(dashboardState.data.right_foot.sensors);
    } else if (dashboardState.status === "offline" && !isScanningWifi) {
      leftHeatmap.resetSensorData();
      rightHeatmap.resetSensorData();
    }

    updateDashboardView({
      ...dashboardState,
      deviceLabel: selectedDeviceLabel,
      isPaused: isScanningWifi,
    });
    updateConfigView({
      deviceLabel: selectedDeviceLabel,
      deviceId: selectedDeviceId,
      hasSelectedDevice: Boolean(selectedDeviceId),
      isSetupConnected,
      wifiSsid: selectedDeviceWifiSsid,
    });
    deviceSetupController?.syncObservedWifiSsid(selectedDeviceWifiSsid);
  });
  dashboardWebSocket.subscribeToDevice(selectedDeviceId);
  dashboardWebSocket.connect();

  deviceSetupController = new DeviceSetupController({
    onDeviceConnected: (deviceId, authToken) => {
      const isSameDevice = selectedDeviceId === deviceId;
      selectedDeviceId = deviceId;
      selectedDeviceLabel = formatDeviceLabel(selectedDeviceId);
      selectedDeviceStatus = isSameDevice ? selectedDeviceStatus : "offline";
      selectedDeviceWifiSsid = isSameDevice ? selectedDeviceWifiSsid : "";
      isSetupConnected = true;
      selectDevice(selectedDeviceId);
      dashboardWebSocket.setAuthToken(authToken);
      dashboardWebSocket.subscribeToDevice(selectedDeviceId);
      updateDashboardView({
        status: selectedDeviceStatus,
        deviceLabel: selectedDeviceLabel,
        isPaused: isScanningWifi,
      });
      updateConfigView({
        deviceLabel: selectedDeviceLabel,
        deviceId: selectedDeviceId,
        hasSelectedDevice: Boolean(selectedDeviceId),
        isSetupConnected,
        wifiSsid: selectedDeviceWifiSsid,
      });
      deviceSetupController?.syncObservedWifiSsid(selectedDeviceWifiSsid);
    },
    onDeviceDisconnected: () => {
      selectedDeviceId = null;
      selectedDeviceLabel = formatDeviceLabel(selectedDeviceId);
      selectedDeviceStatus = "offline";
      selectedDeviceWifiSsid = "";
      isSetupConnected = false;
      clearSelectedDevice();
      dashboardWebSocket.clearAuthToken();
      dashboardWebSocket.unsubscribe();
      leftHeatmap.resetSensorData();
      rightHeatmap.resetSensorData();
      updateDashboardView({
        status: selectedDeviceStatus,
        deviceLabel: selectedDeviceLabel,
        isPaused: isScanningWifi,
      });
      updateConfigView({
        deviceLabel: selectedDeviceLabel,
        deviceId: selectedDeviceId,
        hasSelectedDevice: Boolean(selectedDeviceId),
        isSetupConnected,
        wifiSsid: selectedDeviceWifiSsid,
      });
      deviceSetupController?.syncObservedWifiSsid(selectedDeviceWifiSsid);
    },
    onWifiConnected: (wifiSsid) => {
      selectedDeviceWifiSsid = wifiSsid;
      updateConfigView({
        deviceLabel: selectedDeviceLabel,
        deviceId: selectedDeviceId,
        hasSelectedDevice: Boolean(selectedDeviceId),
        isSetupConnected,
        wifiSsid: selectedDeviceWifiSsid,
      });
    },
    onWifiForgotten: () => {
      selectedDeviceStatus = "offline";
      selectedDeviceWifiSsid = "";
      leftHeatmap.resetSensorData();
      rightHeatmap.resetSensorData();
      updateDashboardView({
        status: selectedDeviceStatus,
        deviceLabel: selectedDeviceLabel,
        isPaused: isScanningWifi,
      });
      updateConfigView({
        deviceLabel: selectedDeviceLabel,
        deviceId: selectedDeviceId,
        hasSelectedDevice: Boolean(selectedDeviceId),
        isSetupConnected,
        wifiSsid: selectedDeviceWifiSsid,
      });
      deviceSetupController?.syncObservedWifiSsid(selectedDeviceWifiSsid);
    },
    onWifiScanStateChanged: (scanState) => {
      isScanningWifi = scanState;
      updateDashboardView({
        status: selectedDeviceStatus,
        deviceLabel: selectedDeviceLabel,
        isPaused: isScanningWifi,
      });
      updateConfigView({
        deviceLabel: selectedDeviceLabel,
        deviceId: selectedDeviceId,
        hasSelectedDevice: Boolean(selectedDeviceId),
        isSetupConnected,
        wifiSsid: selectedDeviceWifiSsid,
      });
    },
  });
  deviceSetupController.init();
  deviceSetupController.syncObservedWifiSsid(selectedDeviceWifiSsid);

  const drawHeatmaps = () => {
    leftHeatmap.draw();
    rightHeatmap.draw();
    requestAnimationFrame(drawHeatmaps);
  };

  drawHeatmaps();
}

main();
