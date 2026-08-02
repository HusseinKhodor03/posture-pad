export function updateConfigView({
  deviceLabel,
  hasSelectedDevice,
  isOnline,
  isScanningWifi = false,
  isSetupConnected,
  wifiSsid,
}) {
  const configTitle = document.getElementById("configTitle");
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

  if (isSetupConnected) {
    configTitle.textContent = deviceLabel;
    configDeviceMessage.textContent = isOnline
      ? "This Posture Pad is connected and ready to stream data."
      : "Choose the Wi-Fi network this Posture Pad should use for streaming data.";
    configWifiStatus.textContent = isOnline
      ? wifiSsid || "Connected"
      : "Not Connected";
    setupSection.hidden = true;
    wifiManagementSection.hidden = false;
    forgetWifiButton.hidden = !isOnline;
    forgetWifiButton.disabled = !isOnline;
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
  configDeviceMessage.textContent = hasSelectedDevice
    ? "Connect this Posture Pad over Bluetooth to view and configure it."
    : "Connect your Posture Pad to configure Wi-Fi.";
  setupSection.hidden = false;
  wifiManagementSection.hidden = true;
  forgetWifiButton.hidden = true;
  otherNetworkButton.disabled = true;
  switchDeviceButton.hidden = true;
  switchDeviceButton.disabled = true;
}
