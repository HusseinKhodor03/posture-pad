export function updateConfigView({
  deviceLabel,
  deviceId,
  hasSelectedDevice,
  isOnline,
  isScanningWifi = false,
  isSetupConnected,
  wifiSsid,
}) {
  const configTitle = document.getElementById("configTitle");
  const configDeviceId = document.getElementById("configDeviceId");
  const configDeviceMessage = document.getElementById("configDeviceMessage");
  const configWifiStatus = document.getElementById("configWifiStatus");
  const setupSection = document.getElementById("setupSection");
  const wifiManagementSection = document.getElementById(
    "wifiManagementSection",
  );
  const networkListMessage = document.getElementById("networkListMessage");
  const scanNetworksButton = document.getElementById("scanNetworksButton");
  const otherNetworkButton = document.getElementById("otherNetworkButton");
  const forgetWifiButton = document.getElementById("forgetWifiButton");
  const switchDeviceButton = document.getElementById("switchDeviceButton");
  const hasKnownWifiNetwork = Boolean(wifiSsid);

  if (isSetupConnected) {
    configTitle.textContent = deviceLabel;
    configDeviceId.textContent = `Device ID: ${deviceId}`;
    configDeviceId.hidden = false;
    configDeviceMessage.hidden = true;
    configWifiStatus.textContent = hasKnownWifiNetwork
      ? wifiSsid
      : "Not Connected";
    setupSection.hidden = true;
    wifiManagementSection.hidden = false;
    forgetWifiButton.hidden = !hasKnownWifiNetwork;
    forgetWifiButton.disabled = !hasKnownWifiNetwork;
    switchDeviceButton.hidden = false;
    switchDeviceButton.disabled = false;
    scanNetworksButton.disabled = isScanningWifi;
    scanNetworksButton.textContent = isScanningWifi
      ? "Scanning..."
      : "Scan Networks";
    otherNetworkButton.disabled = false;
    return;
  }

  configTitle.textContent = hasSelectedDevice
    ? deviceLabel
    : "Set up Posture Pad";
  configDeviceId.textContent = hasSelectedDevice
    ? `Device ID: ${deviceId}`
    : "";
  configDeviceId.hidden = !hasSelectedDevice;
  configDeviceMessage.textContent = hasSelectedDevice
    ? "Connect this Posture Pad over Bluetooth to view and configure it."
    : "Connect your Posture Pad to configure Wi-Fi.";
  configDeviceMessage.hidden = false;
  setupSection.hidden = false;
  wifiManagementSection.hidden = true;
  forgetWifiButton.hidden = true;
  otherNetworkButton.disabled = true;
  switchDeviceButton.hidden = true;
  switchDeviceButton.disabled = true;
}
