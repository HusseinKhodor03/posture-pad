import {
  LEFT_FOOT_SVG,
  LEFT_SENSOR_CONFIG,
  PRESSURE_GRADIENT,
  RIGHT_FOOT_SVG,
  RIGHT_SENSOR_CONFIG,
} from "./config/constants.js";
import {
  formatDeviceLabel,
  loadSelectedDeviceId,
  selectDevice,
} from "./device/device-selection.js";
import { initTabs } from "./ui/tab-controller.js";
import {
  updateDashboardView,
} from "./ui/dashboard-view.js";
import { HeatmapRenderer } from "./ui/heatmap-renderer.js";
import { BleProvisioner } from "./network/ble-provisioner.js";
import { DashboardWebSocket } from "./network/dashboard-web-socket.js";

function main() {
  let selectedDeviceId = loadSelectedDeviceId();
  let selectedDeviceLabel = formatDeviceLabel(selectedDeviceId);

  initTabs();
  updateDashboardView({
    status: "offline",
    deviceLabel: selectedDeviceLabel,
  });

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

  leftHeatmap.init();
  rightHeatmap.init();

  const dashboardWebSocket = new DashboardWebSocket((dashboardState) => {
    if (dashboardState.data) {
      leftHeatmap.updateSensorData(dashboardState.data.left_foot.sensors);
      rightHeatmap.updateSensorData(dashboardState.data.right_foot.sensors);
    } else if (dashboardState.status === "offline") {
      leftHeatmap.resetSensorData();
      rightHeatmap.resetSensorData();
    }

    updateDashboardView({
      ...dashboardState,
      deviceLabel: selectedDeviceLabel,
    });
  });
  dashboardWebSocket.subscribeToDevice(selectedDeviceId);
  dashboardWebSocket.connect();

  const bleProvisioner = new BleProvisioner({
    onDeviceConnected: (deviceId) => {
      selectedDeviceId = deviceId;
      selectedDeviceLabel = formatDeviceLabel(selectedDeviceId);
      selectDevice(selectedDeviceId);
      dashboardWebSocket.subscribeToDevice(selectedDeviceId);
      updateDashboardView({
        status: "offline",
        deviceLabel: selectedDeviceLabel,
      });
    },
  });
  bleProvisioner.init();

  const drawHeatmaps = () => {
    leftHeatmap.draw();
    rightHeatmap.draw();
    requestAnimationFrame(drawHeatmaps);
  };

  drawHeatmaps();
}

main();
