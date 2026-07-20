import { LEFT_FOOT_SVG, RIGHT_FOOT_SVG } from "./config/constants.js";
import {
  leftSensorConfig,
  rightSensorConfig,
  pressureGradient,
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

const adcOutput = document.getElementById("adcOutput");
const voltageOutput = document.getElementById("voltageOutput");
let selectedDeviceId = loadSelectedDeviceId();

initTabs();

const leftHeatmap = new HeatmapRenderer({
  containerId: "leftFootContainer",
  svgFile: LEFT_FOOT_SVG,
  sensorConfig: leftSensorConfig,
  pressureGradient,
});

const rightHeatmap = new HeatmapRenderer({
  containerId: "rightFootContainer",
  svgFile: RIGHT_FOOT_SVG,
  sensorConfig: rightSensorConfig,
  pressureGradient,
});

leftHeatmap.init();
rightHeatmap.init();

function updateDashboard(data) {
  leftHeatmap.updateSensorData(data.left_foot.sensors);
  rightHeatmap.updateSensorData(data.right_foot.sensors);
  updateDashboardMetrics(data);
}

// --------------------------
// WebSocket for live sensor data
// --------------------------
const dashboardWebSocket = new DashboardWebSocket(updateDashboard);
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

// --------------------------
// Animation loop
// --------------------------
function updateHeatmaps() {
  leftHeatmap.draw();
  rightHeatmap.draw();
  requestAnimationFrame(updateHeatmaps);
}

updateHeatmaps();
