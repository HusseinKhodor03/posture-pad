export const DEVICE_ID_STORAGE_KEY = "posturePadDeviceId";
export const LOCAL_WEBSOCKET_URL = "ws://localhost:3000/ws";
export const RAILWAY_WEBSOCKET_URL =
  "wss://posture-pad-production.up.railway.app/ws";

export const BLE_SERVICE_UUID = "e1a87d62-5df4-42f4-9cf9-fe3b312a8d85";
export const DEVICE_ID_UUID = "31c794a4-7189-4023-beb7-f908f31e6224";
export const WIFI_SSID_UUID = "426b1b2a-c11b-49c2-9053-1ba2afc1f6c1";
export const WIFI_PASSWORD_UUID = "ff386352-081f-4803-b256-c0fba4085d2d";
export const COMMAND_UUID = "1d831e2f-0ca5-4bf4-9f84-39487ad6b635";
export const STATUS_UUID = "079a5b9b-eb37-49ff-b11b-fa3c68efd8f8";

export const LEFT_FOOT_SVG = "assets/left_foot.svg";
export const RIGHT_FOOT_SVG = "assets/right_foot.svg";

export const leftSensorConfig = {
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

export const rightSensorConfig = {
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

export const pressureGradient = [
  { value: 0.0, color: [255, 243, 59] },
  { value: 0.25, color: [253, 199, 12] },
  { value: 0.5, color: [243, 144, 63] },
  { value: 0.75, color: [237, 104, 60] },
  { value: 1.0, color: [233, 62, 58] },
];
