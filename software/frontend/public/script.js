const adcOutput = document.getElementById("adcOutput");
const voltageOutput = document.getElementById("voltageOutput");
const ws = new WebSocket("ws://localhost:8080");

// --------------------------
// Dashboard/config tabs
// --------------------------
const tabs = [
  {
    button: document.getElementById("dashboardTab"),
    panel: document.getElementById("dashboardPanel"),
  },
  {
    button: document.getElementById("configTab"),
    panel: document.getElementById("configPanel"),
  },
];

function activateTab(selectedTab) {
  tabs.forEach((tab) => {
    const isSelected = tab === selectedTab;
    tab.button.classList.toggle("active", isSelected);
    tab.panel.hidden = !isSelected;
  });
}

tabs.forEach((tab) => {
  tab.button.addEventListener("click", () => activateTab(tab));
});

// --------------------------
// Bluetooth device connection
// --------------------------
const BLE_SERVICE_UUID = "e1a87d62-5df4-42f4-9cf9-fe3b312a8d85";
const DEVICE_ID_UUID = "31c794a4-7189-4023-beb7-f908f31e6224";
const WIFI_SSID_UUID = "426b1b2a-c11b-49c2-9053-1ba2afc1f6c1";
const WIFI_PASSWORD_UUID = "ff386352-081f-4803-b256-c0fba4085d2d";
const COMMAND_UUID = "1d831e2f-0ca5-4bf4-9f84-39487ad6b635";
const STATUS_UUID = "079a5b9b-eb37-49ff-b11b-fa3c68efd8f8";

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
    const statusCharacteristic =
      await service.getCharacteristic(STATUS_UUID);
    wifiSsidCharacteristic =
      await service.getCharacteristic(WIFI_SSID_UUID);
    wifiPasswordCharacteristic =
      await service.getCharacteristic(WIFI_PASSWORD_UUID);
    commandCharacteristic = await service.getCharacteristic(COMMAND_UUID);

    const deviceIdValue = await deviceIdCharacteristic.readValue();
    const statusValue = await statusCharacteristic.readValue();
    const decoder = new TextDecoder();

    bleDeviceName.textContent = device.name;
    bleDeviceId.textContent = decoder.decode(deviceIdValue);
    bleDeviceStatus.textContent = decoder.decode(statusValue);
    bleDeviceDetails.hidden = false;
    wifiForm.hidden = false;
    connectWifiButton.disabled = false;
    bleStatus.textContent = "Connected";
    bleMessage.textContent = "Your Posture Pad is connected over Bluetooth.";
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

    bleMessage.textContent = "Wi-Fi credentials sent to the Posture Pad.";
  } catch (error) {
    console.error("Could not send Wi-Fi credentials:", error);
    bleMessage.textContent = "Could not send the Wi-Fi credentials.";
  } finally {
    connectWifiButton.disabled = false;
    connectWifiButton.textContent = "Connect to Wi-Fi";
  }
});

// --------------------------
// Sensor configurations
// --------------------------
const rightSensorConfig = {
  sensor0: { x: 0.26, y: 0.1, type: "circular" }, // big toe
  sensor1: { x: 0.45, y: 0.14, type: "circular" },
  sensor2: { x: 0.63, y: 0.18, type: "circular" },
  sensor3: { x: 0.81, y: 0.22, type: "circular" }, // pinky toe
  sensor4: { x: 0.3, y: 0.38, type: "square" }, // midfoot left
  sensor5: { x: 0.8, y: 0.38, type: "square" }, // midfoot right
  sensor6: { x: 0.27, y: 0.613, type: "square" }, // lower left
  sensor7: { x: 0.77, y: 0.613, type: "square" }, // lower right
  sensor8: { x: 0.51, y: 0.85, type: "square" }, // heel
};

const leftSensorConfig = {
  sensor0: { x: 0.74, y: 0.1, type: "circular" }, // big toe
  sensor1: { x: 0.55, y: 0.14, type: "circular" },
  sensor2: { x: 0.37, y: 0.18, type: "circular" },
  sensor3: { x: 0.19, y: 0.22, type: "circular" }, // pinky toe
  sensor4: { x: 0.2, y: 0.38, type: "square" }, // midfoot left
  sensor5: { x: 0.7, y: 0.38, type: "square" }, // midfoot right
  sensor6: { x: 0.23, y: 0.613, type: "square" }, // lower left
  sensor7: { x: 0.73, y: 0.613, type: "square" }, // lower right
  sensor8: { x: 0.49, y: 0.85, type: "square" }, // heel
};

// --------------------------
// Pressure gradient colors
// --------------------------
const pressureGradient = [
  { value: 0.0, color: [255, 243, 59] },
  { value: 0.25, color: [253, 199, 12] },
  { value: 0.5, color: [243, 144, 63] },
  { value: 0.75, color: [237, 104, 60] },
  { value: 1.0, color: [233, 62, 58] },
];

// --------------------------
// Sensor data and blob shapes
// --------------------------
const leftBlobShapes = {};
const rightBlobShapes = {};
let leftSensorData = {};
let rightSensorData = {};

function generateBlobShape(sensorType) {
  const baseSize = sensorType === "square" ? 0.38 : 0.16;
  return { sensorType, baseSize };
}

// Initialize sensor data and blob shapes
Object.keys(leftSensorConfig).forEach((key) => {
  leftSensorData[key] = 0;
  leftBlobShapes[key] = generateBlobShape(leftSensorConfig[key].type);
});

Object.keys(rightSensorConfig).forEach((key) => {
  rightSensorData[key] = 0;
  rightBlobShapes[key] = generateBlobShape(rightSensorConfig[key].type);
});

// --------------------------
// Foot loading and canvas drawing
// --------------------------
function loadFoot(containerId, svgFile, scale = 15) {
  fetch(svgFile)
    .then((res) => res.text())
    .then((svgText) => {
      const container = document.getElementById(containerId);
      container.innerHTML = svgText;

      const svg = container.querySelector("svg");
      const path = svg.querySelector("path");
      if (!path) return;

      const strokeWidth = 0.4;
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "#000");
      path.setAttribute("stroke-width", strokeWidth);

      const bbox = path.getBBox();
      const padding = strokeWidth;

      const canvasWidth = (bbox.width + padding * 2) * scale;
      const canvasHeight = (bbox.height + padding * 2) * scale;

      svg.setAttribute(
        "viewBox",
        `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${
          bbox.height + padding * 2
        }`,
      );
      svg.setAttribute("width", canvasWidth);
      svg.setAttribute("height", canvasHeight);

      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      canvas.style.position = "absolute";
      canvas.style.left = "0";
      canvas.style.top = "0";
      container.style.position = "relative";
      container.appendChild(canvas);

      const ctx = canvas.getContext("2d");

      // --------------------------
      // Helper functions
      // --------------------------
      function getColorForPressure(pressure) {
        for (let i = 0; i < pressureGradient.length - 1; i++) {
          const current = pressureGradient[i];
          const next = pressureGradient[i + 1];
          if (pressure >= current.value && pressure <= next.value) {
            const t = (pressure - current.value) / (next.value - current.value);
            return current.color.map((c, idx) =>
              Math.round(c + (next.color[idx] - c) * t),
            );
          }
        }
        return [255, 243, 59];
      }

      function drawOrganicBlobCanvas(ctx, x, y, shape, pressure) {
        if (pressure <= 0.01) return;

        const [r, g, b] = getColorForPressure(pressure);
        const size = shape.baseSize * 1.3 * bbox.width;

        ctx.save();
        ctx.translate(x, y);

        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1.0)`);
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.95)`);
        gradient.addColorStop(0.8, `rgba(${r}, ${g}, ${b}, 0.85)`);
        gradient.addColorStop(0.95, `rgba(${r}, ${g}, ${b}, 0.6)`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = gradient;

        if (shape.sensorType === "square") {
          ctx.fillRect(-size / 2, -size / 2, size, size);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      function drawHeatmap(sensorData, blobShapes, cfg) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.scale(scale, scale);
        ctx.translate(-bbox.x + padding, -bbox.y + padding);
        const clipPath = new Path2D(path.getAttribute("d"));
        ctx.clip(clipPath);
        ctx.globalCompositeOperation = "screen";

        Object.keys(cfg).forEach((key) => {
          const sensor = cfg[key];
          const pressure = sensorData[key] || 0;
          const cx = bbox.x + bbox.width * sensor.x;
          const cy = bbox.y + bbox.height * sensor.y;
          drawOrganicBlobCanvas(ctx, cx, cy, blobShapes[key], pressure);
        });

        ctx.restore();

        // Draw outline
        ctx.save();
        ctx.scale(scale, scale);
        ctx.translate(-bbox.x + padding, -bbox.y + padding);
        ctx.strokeStyle = path.getAttribute("stroke");
        ctx.lineWidth = strokeWidth;
        ctx.stroke(new Path2D(path.getAttribute("d")));
        ctx.restore();
      }

      container.drawHeatmap = (sensorData) => {
        const cfg =
          containerId === "leftFootContainer"
            ? leftSensorConfig
            : rightSensorConfig;
        const blobShapes =
          containerId === "leftFootContainer"
            ? leftBlobShapes
            : rightBlobShapes;
        drawHeatmap(sensorData, blobShapes, cfg);
      };

      container.drawHeatmap(
        containerId === "leftFootContainer" ? leftSensorData : rightSensorData,
      );
    });
}

// --------------------------
// Load foot SVGs
// --------------------------
loadFoot("leftFootContainer", "left.svg", 15);
loadFoot("rightFootContainer", "right.svg", 15);

// --------------------------
// WebSocket for live sensor data
// --------------------------
ws.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);

  Object.keys(data.left_foot.sensors).forEach((key) => {
    leftSensorData[key] = data.left_foot.sensors[key].normalized;
  });

  Object.keys(data.right_foot.sensors).forEach((key) => {
    rightSensorData[key] = data.right_foot.sensors[key].normalized;
  });

  document.getElementById("postureState").innerText =
    `Posture: ${data.posture_analysis.posture_state}`;

  document.getElementById("balance").innerText =
    `Balance: L ${data.posture_metrics.left_percent}% | R ${data.posture_metrics.right_percent}%`;

  document.getElementById("stability").innerText =
    `Stability: ${data.posture_metrics.stability_score}`;

  document.getElementById("suggestion").innerText =
    `Suggestion: ${data.posture_analysis.posture_suggestion}`;

  document.getElementById("leftTotal").innerText =
    `Total: ${data.left_foot.metrics.total_normalized}`;
  document.getElementById("leftCopX").innerText =
    `CoP X: ${data.left_foot.metrics.cop_x}`;
  document.getElementById("leftCopY").innerText =
    `CoP Y: ${data.left_foot.metrics.cop_y}`;
  document.getElementById("leftForefoot").innerText =
    `Forefoot: ${data.left_foot.metrics.forefoot_pressure}`;
  document.getElementById("leftRearfoot").innerText =
    `Rearfoot: ${data.left_foot.metrics.rearfoot_pressure}`;
  document.getElementById("leftMedial").innerText =
    `Medial: ${data.left_foot.metrics.medial_pressure}`;
  document.getElementById("leftLateral").innerText =
    `Lateral: ${data.left_foot.metrics.lateral_pressure}`;

  document.getElementById("rightTotal").innerText =
    `Total: ${data.right_foot.metrics.total_normalized}`;
  document.getElementById("rightCopX").innerText =
    `CoP X: ${data.right_foot.metrics.cop_x}`;
  document.getElementById("rightCopY").innerText =
    `CoP Y: ${data.right_foot.metrics.cop_y}`;
  document.getElementById("rightForefoot").innerText =
    `Forefoot: ${data.right_foot.metrics.forefoot_pressure}`;
  document.getElementById("rightRearfoot").innerText =
    `Rearfoot: ${data.right_foot.metrics.rearfoot_pressure}`;
  document.getElementById("rightMedial").innerText =
    `Medial: ${data.right_foot.metrics.medial_pressure}`;
  document.getElementById("rightLateral").innerText =
    `Lateral: ${data.right_foot.metrics.lateral_pressure}`;
});

// --------------------------
// Animation loop
// --------------------------
function updateHeatmaps() {
  const leftContainer = document.getElementById("leftFootContainer");
  const rightContainer = document.getElementById("rightFootContainer");

  if (leftContainer && leftContainer.drawHeatmap)
    leftContainer.drawHeatmap(leftSensorData);
  if (rightContainer && rightContainer.drawHeatmap)
    rightContainer.drawHeatmap(rightSensorData);

  requestAnimationFrame(updateHeatmaps);
}

updateHeatmaps();
