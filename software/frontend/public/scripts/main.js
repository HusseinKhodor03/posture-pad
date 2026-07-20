import {
  BLE_SERVICE_UUID,
  DEVICE_ID_UUID,
  WIFI_SSID_UUID,
  WIFI_PASSWORD_UUID,
  COMMAND_UUID,
  STATUS_UUID,
} from "./config/constants.js";
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

const connectBleButton = document.getElementById("connectBleButton");
const bleStatus = document.getElementById("bleStatus");
const bleDeviceName = document.getElementById("bleDeviceName");
const bleMessage = document.getElementById("bleMessage");
const bleDeviceDetails = document.getElementById("bleDeviceDetails");
const bleDeviceId = document.getElementById("bleDeviceId");
const bleDeviceStatus = document.getElementById("bleDeviceStatus");
const wifiForm = document.getElementById("wifiForm");
const wifiSsid = document.getElementById("wifiSsid");
const wifiPassword = document.getElementById("wifiPassword");
const connectWifiButton = document.getElementById("connectWifiButton");

let wifiSsidCharacteristic;
let wifiPasswordCharacteristic;
let commandCharacteristic;

function updateWifiStatus(status) {
  bleDeviceStatus.textContent = status;

  if (status === "connecting") {
    bleMessage.textContent = "The Posture Pad is connecting to Wi-Fi...";
  } else if (status === "connected") {
    bleMessage.textContent = "The Posture Pad is connected to Wi-Fi.";
  }
}

function handleWifiStatusChange(event) {
  updateWifiStatus(new TextDecoder().decode(event.target.value));
}

function handleBleDisconnect() {
  wifiSsidCharacteristic = undefined;
  wifiPasswordCharacteristic = undefined;
  commandCharacteristic = undefined;
  bleStatus.textContent = "Disconnected";
  bleMessage.textContent = "The Bluetooth connection was closed.";
  wifiForm.hidden = true;
  connectWifiButton.disabled = true;
  connectBleButton.disabled = false;
  connectBleButton.textContent = "Reconnect Posture Pad";
}

connectBleButton.addEventListener("click", async () => {
  if (!navigator.bluetooth) {
    bleStatus.textContent = "Bluetooth unavailable";
    bleMessage.textContent =
      "This browser does not support Web Bluetooth. Try Chrome or Edge.";
    return;
  }

  connectBleButton.disabled = true;
  bleStatus.textContent = "Connecting...";
  bleMessage.textContent = "Choose your Posture Pad from the browser prompt.";

  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [BLE_SERVICE_UUID] }],
    });

    device.addEventListener("gattserverdisconnected", handleBleDisconnect);

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(BLE_SERVICE_UUID);
    const deviceIdCharacteristic =
      await service.getCharacteristic(DEVICE_ID_UUID);
    const statusCharacteristic = await service.getCharacteristic(STATUS_UUID);
    wifiSsidCharacteristic = await service.getCharacteristic(WIFI_SSID_UUID);
    wifiPasswordCharacteristic =
      await service.getCharacteristic(WIFI_PASSWORD_UUID);
    commandCharacteristic = await service.getCharacteristic(COMMAND_UUID);

    const deviceIdValue = await deviceIdCharacteristic.readValue();
    const statusValue = await statusCharacteristic.readValue();
    const decoder = new TextDecoder();

    statusCharacteristic.addEventListener(
      "characteristicvaluechanged",
      handleWifiStatusChange,
    );
    await statusCharacteristic.startNotifications();

    selectedDeviceId = decoder.decode(deviceIdValue);
    rememberSelectedDeviceId(selectedDeviceId);
    dashboardWebSocket.subscribeToDevice(selectedDeviceId);

    bleDeviceName.textContent = device.name;
    bleDeviceId.textContent = selectedDeviceId;
    bleDeviceDetails.hidden = false;
    wifiForm.hidden = false;
    connectWifiButton.disabled = false;
    bleStatus.textContent = "Connected";
    bleMessage.textContent = "Your Posture Pad is connected over Bluetooth.";
    updateWifiStatus(decoder.decode(statusValue));
    connectBleButton.textContent = "Connected";
  } catch (error) {
    console.error("Bluetooth connection failed:", error);
    bleStatus.textContent = "Not connected";
    bleMessage.textContent = "Could not connect to the Posture Pad.";
    connectBleButton.disabled = false;
  }
});

connectWifiButton.addEventListener("click", async () => {
  const encoder = new TextEncoder();
  const ssidValue = encoder.encode(wifiSsid.value);
  const passwordValue = encoder.encode(wifiPassword.value);

  if (ssidValue.length === 0) {
    bleMessage.textContent = "Enter a Wi-Fi network name.";
    return;
  }

  if (ssidValue.length > 32 || passwordValue.length > 64) {
    bleMessage.textContent = "The network name or password is too long.";
    return;
  }

  connectWifiButton.disabled = true;
  connectWifiButton.textContent = "Sending...";

  try {
    await wifiSsidCharacteristic.writeValueWithResponse(ssidValue);
    await wifiPasswordCharacteristic.writeValueWithResponse(passwordValue);
    await commandCharacteristic.writeValueWithResponse(
      encoder.encode("connect"),
    );

    if (bleDeviceStatus.textContent === "unconfigured") {
      bleMessage.textContent = "Wi-Fi credentials sent to the Posture Pad.";
    }
  } catch (error) {
    console.error("Could not send Wi-Fi credentials:", error);
    bleMessage.textContent = "Could not send the Wi-Fi credentials.";
  } finally {
    connectWifiButton.disabled = false;
    connectWifiButton.textContent = "Connect to Wi-Fi";
  }
});

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

// --------------------------
// Animation loop
// --------------------------
function updateHeatmaps() {
  leftHeatmap.draw();
  rightHeatmap.draw();
  requestAnimationFrame(updateHeatmaps);
}

updateHeatmaps();
