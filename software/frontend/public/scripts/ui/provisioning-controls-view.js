export class ProvisioningControlsView {
  constructor() {
    this.setupSection = document.getElementById("setupSection");
    this.wifiManagementSection = document.getElementById(
      "wifiManagementSection",
    );
    this.connectBleButton = document.getElementById("connectBleButton");
    this.bleDeviceName = document.getElementById("bleDeviceName");
    this.bleMessage = document.getElementById("bleMessage");
    this.bleDeviceDetails = document.getElementById("bleDeviceDetails");
    this.bleDeviceId = document.getElementById("bleDeviceId");
    this.bleDeviceStatus = document.getElementById("bleDeviceStatus");
    this.scanNetworksButton = document.getElementById("scanNetworksButton");
    this.otherNetworkButton = document.getElementById("otherNetworkButton");
    this.forgetWifiButton = document.getElementById("forgetWifiButton");
    this.switchDeviceButton = document.getElementById("switchDeviceButton");
    this.networkSpinner = document.getElementById("networkSpinner");
  }

  bind({
    onConnectDevice,
    onScanNetworks,
    onOtherNetwork,
    onForgetWifi,
    onSwitchDevice,
  } = {}) {
    this.connectBleButton.addEventListener("click", () => {
      onConnectDevice?.();
    });

    this.scanNetworksButton.addEventListener("click", () => {
      onScanNetworks?.();
    });

    this.otherNetworkButton.addEventListener("click", () => {
      onOtherNetwork?.();
    });

    this.forgetWifiButton.addEventListener("click", () => {
      onForgetWifi?.();
    });

    this.switchDeviceButton.addEventListener("click", () => {
      onSwitchDevice?.();
    });
  }

  showBluetoothUnsupported() {
    this.bleMessage.textContent =
      "This browser does not support Web Bluetooth. Try Chrome or Edge.";
  }

  showChoosingDevice() {
    this.connectBleButton.disabled = true;
    this.bleMessage.classList.remove("error");
    this.bleMessage.textContent =
      "Choose your Posture Pad from the browser prompt.";
  }

  showConnectionFailed() {
    this.bleMessage.textContent =
      "Make sure your device is powered on and nearby.";
    this.connectBleButton.disabled = false;
  }

  showSwitchingDevice() {
    this.disableForSwitch();
    this.bleMessage.textContent = "Disconnecting current Posture Pad...";
  }

  showDeviceReady({ name, deviceId, hasKnownWifiNetwork }) {
    this.bleDeviceName.textContent = name;
    this.bleDeviceId.textContent = deviceId;
    this.bleDeviceDetails.hidden = false;
    this.bleMessage.classList.remove("error");
    this.bleMessage.textContent = "Your Posture Pad is ready for Wi-Fi setup.";
    this.connectBleButton.textContent = "Connected";
    this.connectBleButton.disabled = true;
    this.setManagementAvailable(true, { hasKnownWifiNetwork });
  }

  showBusyDevice(deviceId) {
    this.setManagementAvailable(false);
    this.bleDeviceName.textContent = "Connect Device";
    this.bleMessage.classList.add("error");
    this.bleMessage.textContent =
      `PosturePad-${deviceId.slice(-6)} is already being configured in another browser.`;
    this.bleDeviceDetails.hidden = true;
    this.connectBleButton.disabled = false;
    this.connectBleButton.textContent = "Connect Device";
    this.scanNetworksButton.disabled = true;
    this.otherNetworkButton.disabled = true;
    this.switchDeviceButton.hidden = true;
    this.switchDeviceButton.disabled = true;
    this.forgetWifiButton.hidden = true;
    this.scanNetworksButton.textContent = "Scan Networks";
  }

  showDisconnected() {
    this.setManagementAvailable(false);
    this.bleDeviceName.textContent = "Connect Device";
    this.bleMessage.classList.remove("error");
    this.bleMessage.textContent =
      "Make sure your device is powered on and nearby.";
    this.bleDeviceDetails.hidden = true;
    this.connectBleButton.disabled = false;
    this.connectBleButton.textContent = "Connect Device";
    this.scanNetworksButton.disabled = true;
    this.otherNetworkButton.disabled = true;
    this.switchDeviceButton.hidden = true;
    this.switchDeviceButton.disabled = true;
    this.forgetWifiButton.hidden = true;
    this.scanNetworksButton.textContent = "Scan Networks";
  }

  showWifiStatus(status) {
    this.bleDeviceStatus.textContent = status;

    if (status === "connecting") {
      this.bleMessage.textContent = "The Posture Pad is connecting to Wi-Fi...";
    } else if (status === "connected") {
      this.bleMessage.textContent = "The Posture Pad is connected to Wi-Fi.";
    }
  }

  showScanState(isScanning) {
    this.scanNetworksButton.disabled = isScanning;
    this.scanNetworksButton.textContent = isScanning
      ? "Scanning..."
      : "Scan Networks";
    this.networkSpinner.hidden = !isScanning;
  }

  showForgetState(isForgetting) {
    this.forgetWifiButton.disabled = isForgetting;
    this.forgetWifiButton.textContent = isForgetting
      ? "Forgetting..."
      : "Forget This Network...";
  }

  showMessage(message, { isError = false } = {}) {
    this.bleMessage.classList.toggle("error", isError);
    this.bleMessage.textContent = message;
  }

  setManagementAvailable(isAvailable, { hasKnownWifiNetwork = false } = {}) {
    this.setupSection.hidden = isAvailable;
    this.wifiManagementSection.hidden = !isAvailable;
    this.setKnownWifiNetwork(hasKnownWifiNetwork);

    if (isAvailable) {
      this.switchDeviceButton.hidden = false;
      this.switchDeviceButton.disabled = false;
      this.otherNetworkButton.disabled = false;
      this.showScanState(false);
      return;
    }

    this.switchDeviceButton.hidden = true;
    this.switchDeviceButton.disabled = true;
    this.otherNetworkButton.disabled = true;
    this.scanNetworksButton.disabled = true;
    this.scanNetworksButton.textContent = "Scan Networks";
    this.networkSpinner.hidden = true;
  }

  setKnownWifiNetwork(hasKnownWifiNetwork) {
    this.forgetWifiButton.hidden = !hasKnownWifiNetwork;
    this.forgetWifiButton.disabled = !hasKnownWifiNetwork;
  }

  disableForSwitch() {
    this.scanNetworksButton.disabled = true;
    this.otherNetworkButton.disabled = true;
    this.forgetWifiButton.disabled = true;
    this.switchDeviceButton.disabled = true;
  }
}
