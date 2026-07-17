import { DEVICE_ID_STORAGE_KEY } from "../config/constants.js";

export function loadSelectedDeviceId() {
  return localStorage.getItem(DEVICE_ID_STORAGE_KEY);
}

export function rememberSelectedDeviceId(deviceId) {
  localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
}
