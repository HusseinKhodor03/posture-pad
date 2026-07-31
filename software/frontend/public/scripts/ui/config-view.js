export function updateConfigView({
  deviceLabel,
  hasSelectedDevice,
  isOnline,
  isSetupConnected,
  wifiSsid,
}) {
  const bleStatus = document.getElementById("bleStatus");
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

  if (isOnline) {
    bleStatus.textContent = "Wi-Fi";
    configTitle.textContent = deviceLabel;
    configDeviceMessage.textContent =
      "This Posture Pad is connected and ready to stream data.";
    configWifiStatus.textContent = wifiSsid
      ? `Connected to Wi-Fi: ${wifiSsid}`
      : "Connected to Wi-Fi";
    setupSection.hidden = true;
    wifiManagementSection.hidden = false;
    networkListMessage.textContent =
      "Network scanning is available during setup.";
    scanNetworksButton.disabled = true;
    otherNetworkButton.disabled = true;
    return;
  }

  if (isSetupConnected) {
    bleStatus.textContent = "Setup";
    configTitle.textContent = deviceLabel;
    configDeviceMessage.textContent =
      "Choose the Wi-Fi network this Posture Pad should use for streaming data.";
    configWifiStatus.textContent = "Not connected to Wi-Fi";
    setupSection.hidden = true;
    wifiManagementSection.hidden = false;
    networkListMessage.textContent =
      "Scan nearby networks or enter a network manually.";
    scanNetworksButton.disabled = false;
    otherNetworkButton.disabled = false;
    return;
  }

  bleStatus.textContent = "Setup";
  configTitle.textContent = hasSelectedDevice
    ? deviceLabel
    : "Set up Posture Pad";
  configDeviceMessage.textContent = hasSelectedDevice
    ? "Waiting for this Posture Pad to reconnect."
    : "Connect your Posture Pad to configure Wi-Fi.";
  setupSection.hidden = false;
  wifiManagementSection.hidden = true;
  otherNetworkButton.disabled = true;
}
