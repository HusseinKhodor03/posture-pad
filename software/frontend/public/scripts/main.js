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

function main() {
  let selectedDeviceId = loadSelectedDeviceId();

  initTabs();

  const { leftHeatmap, rightHeatmap } = createHeatmaps();
  leftHeatmap.init();
  rightHeatmap.init();

  const dashboardWebSocket = createDashboardWebSocket({
    selectedDeviceId,
    onSensorData: (data) => {
      leftHeatmap.updateSensorData(data.left_foot.sensors);
      rightHeatmap.updateSensorData(data.right_foot.sensors);
      updateDashboardMetrics(data);
    },
  });

  const bleProvisioner = new BleProvisioner({
    onDeviceConnected: (deviceId) => {
      selectedDeviceId = deviceId;
      rememberSelectedDeviceId(selectedDeviceId);
      dashboardWebSocket.subscribeToDevice(selectedDeviceId);
    },
  });
  bleProvisioner.init();

  function updateHeatmaps() {
    leftHeatmap.draw();
    rightHeatmap.draw();
    requestAnimationFrame(updateHeatmaps);
  }

  updateHeatmaps();
}

function createHeatmaps() {
  return {
    leftHeatmap: new HeatmapRenderer({
      containerId: "leftFootContainer",
      svgFile: LEFT_FOOT_SVG,
      sensorConfig: leftSensorConfig,
      pressureGradient,
    }),
    rightHeatmap: new HeatmapRenderer({
      containerId: "rightFootContainer",
      svgFile: RIGHT_FOOT_SVG,
      sensorConfig: rightSensorConfig,
      pressureGradient,
    }),
  };
}

function createDashboardWebSocket({ selectedDeviceId, onSensorData }) {
  const dashboardWebSocket = new DashboardWebSocket(onSensorData);
  dashboardWebSocket.subscribeToDevice(selectedDeviceId);
  dashboardWebSocket.connect();
  return dashboardWebSocket;
}

main();
