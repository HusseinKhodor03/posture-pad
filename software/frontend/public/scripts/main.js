import {
  LEFT_FOOT_SVG,
  LEFT_SENSOR_CONFIG,
  PRESSURE_GRADIENT,
  RIGHT_FOOT_SVG,
  RIGHT_SENSOR_CONFIG,
} from "./config/constants.js";
import {
  loadSelectedDeviceId,
  rememberSelectedDeviceId,
} from "./device/device-store.js";
import { initTabs } from "./ui/tab-controller.js";
import { updateDashboardMetrics } from "./ui/dashboard-view.js";
import { HeatmapRenderer } from "./ui/heatmap-renderer.js";
import { BleProvisioner } from "./network/ble-provisioner.js";
import { DashboardWebSocket } from "./network/dashboard-web-socket.js";

function main() {
  let selectedDeviceId = loadSelectedDeviceId();

  initTabs();

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

  const dashboardWebSocket = new DashboardWebSocket((data) => {
    leftHeatmap.updateSensorData(data.left_foot.sensors);
    rightHeatmap.updateSensorData(data.right_foot.sensors);
    updateDashboardMetrics(data);
  });
  dashboardWebSocket.subscribeToDevice(selectedDeviceId);
  dashboardWebSocket.connect();

  const bleProvisioner = new BleProvisioner({
    onDeviceConnected: (deviceId) => {
      selectedDeviceId = deviceId;
      rememberSelectedDeviceId(selectedDeviceId);
      dashboardWebSocket.subscribeToDevice(selectedDeviceId);
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
