export function updateConfigView({
  deviceLabel,
  deviceId,
  hasSelectedDevice,
  isSetupConnected,
  wifiSsid,
}) {
  const configTitle = document.getElementById("configTitle");
  const configDeviceId = document.getElementById("configDeviceId");
  const configDeviceMessage = document.getElementById("configDeviceMessage");
  const configWifiStatus = document.getElementById("configWifiStatus");
  const hasKnownWifiNetwork = Boolean(wifiSsid);

  if (isSetupConnected) {
    configTitle.textContent = deviceLabel;
    configDeviceId.textContent = `Device ID: ${deviceId}`;
    configDeviceId.hidden = false;
    configDeviceMessage.hidden = true;
    configWifiStatus.textContent = hasKnownWifiNetwork
      ? wifiSsid
      : "Not Connected";
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
  configWifiStatus.textContent = "Not Connected";
}
