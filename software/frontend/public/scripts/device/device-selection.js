export function loadSelectedDeviceId() {
  return new URLSearchParams(window.location.search).get("device");
}

export function selectDevice(deviceId) {
  const url = new URL(window.location);
  url.searchParams.set("device", deviceId);
  window.history.replaceState({}, "", url);
}

export function clearSelectedDevice() {
  const url = new URL(window.location);
  url.searchParams.delete("device");
  window.history.replaceState({}, "", url);
}

export function formatDeviceLabel(deviceId) {
  return deviceId ? `Posture Pad ${deviceId.slice(-6)}` : "No device selected";
}
