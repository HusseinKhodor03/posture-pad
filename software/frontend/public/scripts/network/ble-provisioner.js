import {
  BLE_SERVICE_UUID,
  COMMAND_UUID,
  DEVICE_ID_UUID,
  PAIRING_TOKEN_UUID,
  SETUP_SESSION_UUID,
  STATUS_UUID,
  WIFI_PASSWORD_UUID,
  WIFI_CONNECTION_TIMEOUT_MS,
  WIFI_FORGET_TIMEOUT_MS,
  WIFI_SCAN_RESULTS_UUID,
  WIFI_SCAN_TIMEOUT_MS,
  WIFI_SSID_UUID,
} from "../config/constants.js";
import { createWifiSignalIcon } from "../ui/wifi-signal-icon.js";

export class BleProvisioner {
  constructor({
    onDeviceConnected,
    onDeviceDisconnected,
    onWifiForgotten,
    onWifiScanStateChanged,
  }) {
    this.onDeviceConnected = onDeviceConnected;
    this.onDeviceDisconnected = onDeviceDisconnected;
    this.onWifiForgotten = onWifiForgotten;
    this.onWifiScanStateChanged = onWifiScanStateChanged;
    this.wifiSsidCharacteristic = null;
    this.wifiPasswordCharacteristic = null;
    this.commandCharacteristic = null;
    this.scanResultsCharacteristic = null;
    this.setupSessionCharacteristic = null;
    this.setupSessionId = "";
    this.setupSessionHeartbeat = null;
    this.wifiScanTimeout = null;
    this.wifiConnectionTimeout = null;
    this.wifiForgetTimeout = null;
    this.selectedNetwork = null;
    this.scannedNetworks = [];
    this.pendingScanNetworks = [];
    this.networkListSignature = "";
    this.connectedWifiSsid = "";
    this.pendingWifiSsid = "";
    this.wifiConnectionInterrupted = false;
    this.bleDevice = null;
    this.isSwitchingDevice = false;
    this.isScanningWifi = false;
    this.isConnectingWifi = false;
    this.isForgettingWifi = false;
  }

  init() {
    this.connectBleButton = document.getElementById("connectBleButton");
    this.bleDeviceName = document.getElementById("bleDeviceName");
    this.bleMessage = document.getElementById("bleMessage");
    this.bleDeviceDetails = document.getElementById("bleDeviceDetails");
    this.bleDeviceId = document.getElementById("bleDeviceId");
    this.bleDeviceStatus = document.getElementById("bleDeviceStatus");
    this.wifiDialog = document.getElementById("wifiDialog");
    this.wifiDialogTitle = document.getElementById("wifiDialogTitle");
    this.wifiDialogMessage = document.getElementById("wifiDialogMessage");
    this.wifiSsidLabel = document.getElementById("wifiSsidLabel");
    this.wifiSsid = document.getElementById("wifiSsid");
    this.wifiPasswordLabel = document.getElementById("wifiPasswordLabel");
    this.wifiPassword = document.getElementById("wifiPassword");
    this.connectWifiButton = document.getElementById("connectWifiButton");
    this.cancelWifiButton = document.getElementById("cancelWifiButton");
    this.scanNetworksButton = document.getElementById("scanNetworksButton");
    this.otherNetworkButton = document.getElementById("otherNetworkButton");
    this.forgetWifiButton = document.getElementById("forgetWifiButton");
    this.switchDeviceButton = document.getElementById("switchDeviceButton");
    this.networkSpinner = document.getElementById("networkSpinner");
    this.networkListMessage = document.getElementById("networkListMessage");
    this.networkList = document.getElementById("networkList");

    this.connectBleButton.addEventListener("click", () => {
      this.connectDevice();
    });

    this.connectWifiButton.addEventListener("click", () => {
      this.sendWifiCredentials();
    });

    this.wifiSsid.addEventListener("input", () => {
      this.updateWifiConnectButton();
    });

    this.wifiPassword.addEventListener("input", () => {
      this.updateWifiConnectButton();
    });

    this.cancelWifiButton.addEventListener("click", () => {
      this.closeWifiDialog();
    });

    this.scanNetworksButton.addEventListener("click", () => {
      this.scanWifiNetworks();
    });

    this.otherNetworkButton.addEventListener("click", () => {
      this.openManualNetworkDialog();
    });

    this.forgetWifiButton.addEventListener("click", () => {
      this.forgetWifiNetwork();
    });

    this.switchDeviceButton.addEventListener("click", () => {
      this.switchDevice();
    });

    this.networkList.addEventListener("click", (event) => {
      const networkButton = event.target.closest(".networkListButton");

      if (!networkButton) {
        return;
      }

      const networkIndex = Number(networkButton.dataset.networkIndex);
      const network = this.scannedNetworks[networkIndex];

      if (network && !this.isConnectingWifi) {
        this.selectNetwork(network);
      }
    });

    window.addEventListener("pagehide", () => {
      this.releaseSetupSession();
    });
  }

  async connectDevice() {
    if (!navigator.bluetooth) {
      this.bleMessage.textContent =
        "This browser does not support Web Bluetooth. Try Chrome or Edge.";
      return;
    }

    this.connectBleButton.disabled = true;
    this.bleMessage.textContent =
      "Choose your Posture Pad from the browser prompt.";

    try {
      const device = await this.requestBluetoothDevice();
      await this.connectSelectedDevice(device);
    } catch (error) {
      console.error("Bluetooth connection failed:", error);
      await this.releaseSetupSession();
      this.stopSetupSessionHeartbeat();
      this.setupSessionId = "";
      this.bleMessage.textContent = "Could not connect to the Posture Pad.";
      this.connectBleButton.disabled = false;
    }
  }

  async switchDevice() {
    if (!navigator.bluetooth) {
      this.bleMessage.textContent =
        "This browser does not support Web Bluetooth. Try Chrome or Edge.";
      return;
    }

    this.switchDeviceButton.disabled = true;
    this.bleMessage.textContent =
      "Choose another Posture Pad from the browser prompt.";

    try {
      const device = await this.requestBluetoothDevice();

      if (this.bleDevice?.id === device.id) {
        this.bleMessage.textContent =
          "This browser is already connected to that Posture Pad.";
        this.switchDeviceButton.disabled = false;
        return;
      }

      this.isSwitchingDevice = true;
      await this.disconnectCurrentDeviceForSwitch();
      await this.connectSelectedDevice(device);
    } catch (error) {
      console.error("Could not switch Posture Pads:", error);
      this.bleMessage.textContent = "Could not switch Posture Pads.";
      this.switchDeviceButton.disabled = false;
    } finally {
      this.isSwitchingDevice = false;
    }
  }

  async requestBluetoothDevice() {
    return navigator.bluetooth.requestDevice({
      filters: [{ services: [BLE_SERVICE_UUID] }],
    });
  }

  async connectSelectedDevice(device) {
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(BLE_SERVICE_UUID);
    const deviceIdCharacteristic =
      await service.getCharacteristic(DEVICE_ID_UUID);
    const pairingTokenCharacteristic =
      await service.getCharacteristic(PAIRING_TOKEN_UUID);
    const statusCharacteristic = await service.getCharacteristic(STATUS_UUID);
    this.wifiSsidCharacteristic =
      await service.getCharacteristic(WIFI_SSID_UUID);
    this.wifiPasswordCharacteristic =
      await service.getCharacteristic(WIFI_PASSWORD_UUID);
    this.commandCharacteristic = await service.getCharacteristic(COMMAND_UUID);
    this.scanResultsCharacteristic =
      await service.getCharacteristic(WIFI_SCAN_RESULTS_UUID);
    this.setupSessionCharacteristic =
      await service.getCharacteristic(SETUP_SESSION_UUID);

    const deviceIdValue = await deviceIdCharacteristic.readValue();
    const statusValue = await statusCharacteristic.readValue();
    const decoder = new TextDecoder();
    const deviceId = decoder.decode(deviceIdValue);

    const setupSessionClaimed = await this.claimSetupSession(deviceId);

    if (!setupSessionClaimed) {
      this.showBusyDeviceMessage(deviceId);
      device.gatt.disconnect();
      return;
    }

    this.bleDevice = device;
    device.addEventListener("gattserverdisconnected", () => {
      this.handleDisconnect(device);
    });

    const pairingTokenValue = await pairingTokenCharacteristic.readValue();

    statusCharacteristic.addEventListener(
      "characteristicvaluechanged",
      (event) => {
        this.handleWifiStatusChange(event);
      },
    );
    await statusCharacteristic.startNotifications();
    this.scanResultsCharacteristic.addEventListener(
      "characteristicvaluechanged",
      (event) => {
        this.handleScanResultsChange(event);
      },
    );
    await this.scanResultsCharacteristic.startNotifications();

    const pairingToken = decoder.decode(pairingTokenValue);
    this.onDeviceConnected(deviceId, pairingToken);

    this.bleDeviceName.textContent = device.name;
    this.bleDeviceId.textContent = deviceId;
    this.bleDeviceDetails.hidden = false;
    this.closeWifiDialog();
    this.otherNetworkButton.disabled = false;
    this.switchDeviceButton.disabled = false;
    this.bleMessage.textContent = "Your Posture Pad is ready for Wi-Fi setup.";
    this.updateWifiStatus(decoder.decode(statusValue));
    this.connectBleButton.textContent = "Connected";
    this.scanNetworksButton.disabled = false;
    this.scanWifiNetworks();
  }

  async disconnectCurrentDeviceForSwitch() {
    await this.releaseSetupSession();
    this.stopSetupSessionHeartbeat();
    this.setupSessionId = "";

    if (this.bleDevice?.gatt.connected) {
      this.bleDevice.gatt.disconnect();
    }
  }

  async sendWifiCredentials(
    ssid = this.selectedNetwork?.ssid ?? this.wifiSsid.value.trim(),
    password = this.wifiPassword.value,
    button = this.connectWifiButton,
  ) {
    if (this.isConnectingWifi) {
      return;
    }

    const encoder = new TextEncoder();
    const ssidValue = encoder.encode(ssid);
    const passwordValue = encoder.encode(password);

    if (ssidValue.length === 0) {
      this.bleMessage.textContent = "Enter a Wi-Fi network name.";
      return;
    }

    if (ssidValue.length > 32 || passwordValue.length > 64) {
      this.bleMessage.textContent =
        "The network name or password is too long.";
      return;
    }

    if (this.isConnectedSsid(ssid)) {
      this.showWifiDialogMessage(`"${ssid}" is already connected.`, true);
      this.updateWifiConnectButton();
      this.focusWifiDialogInput();
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = "Connecting...";
    }

    try {
      this.startWifiConnectionAttempt(ssid);
      await this.wifiSsidCharacteristic.writeValueWithResponse(ssidValue);
      await this.wifiPasswordCharacteristic.writeValueWithResponse(
        passwordValue,
      );
      await this.commandCharacteristic.writeValueWithResponse(
        encoder.encode(`connect:${this.setupSessionId}`),
      );

      if (this.bleDeviceStatus.textContent === "unconfigured") {
        this.bleMessage.textContent =
          "Wi-Fi credentials sent to the Posture Pad.";
      }
    } catch (error) {
      this.showWifiConnectionError(
        ssid,
        `Could not send Wi-Fi credentials for "${ssid}".`,
      );
      console.error("Could not send Wi-Fi credentials:", error);
      this.bleMessage.textContent = "Could not send the Wi-Fi credentials.";
    }
  }

  async scanWifiNetworks() {
    if (!this.commandCharacteristic || this.isScanningWifi) {
      return;
    }

    this.scanNetworksButton.disabled = true;
    this.scanNetworksButton.textContent = "Scanning...";
    this.networkListMessage.textContent = "";
    this.networkList.replaceChildren();
    this.scannedNetworks = [];
    this.pendingScanNetworks = [];
    this.networkListSignature = "";
    this.closeWifiDialog();
    this.setWifiScanState(true);

    try {
      await this.commandCharacteristic.writeValueWithResponse(
        new TextEncoder().encode(`scan:${this.setupSessionId}`),
      );
    } catch (error) {
      console.error("Could not start Wi-Fi scan:", error);
      this.networkListMessage.textContent = "Could not scan Wi-Fi networks.";
      this.scanNetworksButton.disabled = false;
      this.scanNetworksButton.textContent = "Scan Networks";
      this.setWifiScanState(false);
    }
  }

  async requestScanPage(page) {
    try {
      await this.commandCharacteristic.writeValueWithResponse(
        new TextEncoder().encode(`scan_page:${this.setupSessionId}:${page}`),
      );
    } catch (error) {
      console.error("Could not request Wi-Fi scan page:", error);
      this.networkListMessage.textContent = "Could not read Wi-Fi scan results.";
      this.scanNetworksButton.disabled = false;
      this.scanNetworksButton.textContent = "Scan Networks";
      this.setWifiScanState(false);
    }
  }

  async forgetWifiNetwork() {
    if (
      !this.commandCharacteristic ||
      !this.setupSessionId ||
      this.isForgettingWifi
    ) {
      return;
    }

    this.isForgettingWifi = true;
    this.startWifiForgetTimeout();
    this.forgetWifiButton.disabled = true;
    this.forgetWifiButton.textContent = "Forgetting...";
    this.closeWifiDialog();

    try {
      await this.commandCharacteristic.writeValueWithResponse(
        new TextEncoder().encode(`forget:${this.setupSessionId}`),
      );
    } catch (error) {
      console.error("Could not forget Wi-Fi network:", error);
      this.stopWifiForgetTimeout();
      this.bleMessage.textContent = "Could not forget the Wi-Fi network.";
      this.isForgettingWifi = false;
      this.forgetWifiButton.disabled = false;
      this.forgetWifiButton.textContent = "Forget This Network...";
    }
  }

  updateWifiStatus(status) {
    this.bleDeviceStatus.textContent = status;

    if (status === "connecting") {
      this.bleMessage.textContent = "The Posture Pad is connecting to Wi-Fi...";
    } else if (status === "connected") {
      this.bleMessage.textContent = "The Posture Pad is connected to Wi-Fi.";
    } else if (status === "unconfigured" && this.isForgettingWifi) {
      this.finishForgetWifiNetwork();
    } else if (status === "unconfigured" && this.pendingWifiSsid) {
      this.wifiConnectionInterrupted = true;
      this.showWifiConnectionError(
        this.pendingWifiSsid,
        this.getWifiConnectionErrorMessage(this.pendingWifiSsid),
      );
    }
  }

  handleWifiStatusChange(event) {
    this.updateWifiStatus(new TextDecoder().decode(event.target.value));
  }

  async handleScanResultsChange(event) {
    let scanResults;

    try {
      const value = event.target.value;
      const scanResultText = new TextDecoder().decode(value);
      scanResults = JSON.parse(scanResultText);
    } catch (error) {
      console.error("Could not read Wi-Fi scan results:", error);
      this.networkListMessage.textContent =
        "Could not read Wi-Fi scan results.";
      this.scanNetworksButton.disabled = false;
      this.scanNetworksButton.textContent = "Scan Networks";
      this.setWifiScanState(false);
      return;
    }

    if (scanResults.status === "scanning") {
      if (this.isScanningWifi) {
        this.networkListMessage.textContent = "";
      }
      return;
    }

    if (scanResults.status !== "complete") {
      this.networkListMessage.textContent = "Could not scan Wi-Fi networks.";
      this.scanNetworksButton.disabled = false;
      this.scanNetworksButton.textContent = "Scan Networks";
      this.setWifiScanState(false);
      return;
    }

    if (scanResults.page === 0) {
      this.pendingScanNetworks = [];
    }

    this.pendingScanNetworks.push(...(scanResults.networks ?? []));

    if (scanResults.has_more) {
      await this.requestScanPage((scanResults.page ?? 0) + 1);
      return;
    }

    this.scanNetworksButton.disabled = false;
    this.scanNetworksButton.textContent = "Scan Networks";
    this.setWifiScanState(false);
    this.renderNetworkList(this.pendingScanNetworks);
  }

  renderNetworkList(networks) {
    const networkListSignature = this.buildNetworkListSignature(networks);
    const networkListChanged =
      networkListSignature !== this.networkListSignature;

    this.scannedNetworks = networks;

    if (!networkListChanged) {
      if (networks.length) {
        this.networkListMessage.textContent = "";
      }

      return;
    }

    this.networkListSignature = networkListSignature;
    this.networkList.replaceChildren();

    if (!networks.length) {
      this.networkListMessage.textContent = "No Wi-Fi networks found.";
      return;
    }

    this.networkListMessage.textContent = "";

    networks.forEach((network, index) => {
      const isConnectedNetwork = this.isConnectedNetwork(network);
      const networkItem = document.createElement("li");
      networkItem.className = "networkListItem";

      const networkButton = document.createElement("button");
      networkButton.className = `networkListButton ${
        isConnectedNetwork ? "connected" : ""
      }`;
      networkButton.type = "button";
      networkButton.dataset.networkIndex = index;
      networkButton.disabled = isConnectedNetwork;

      const networkName = document.createElement("span");
      networkName.className = "networkName";
      networkName.textContent = network.ssid;

      const networkIcons = document.createElement("span");
      networkIcons.className = "networkIcons";

      if (isConnectedNetwork) {
        const connectedLabel = document.createElement("span");
        connectedLabel.className = "networkConnectedLabel";
        connectedLabel.textContent = "Connected";
        networkIcons.appendChild(connectedLabel);
      }

      const lockIcon = document.createElement("span");
      lockIcon.className = `networkIcon networkLockIcon ${
        network.secure ? "secure" : "open"
      }`;
      lockIcon.title = network.secure ? "Secured network" : "Open network";

      const signalIcon = document.createElement("span");
      signalIcon.className = "networkIcon networkSignalIcon";
      signalIcon.title = this.getSignalLabel(network.rssi);
      signalIcon.appendChild(
        createWifiSignalIcon(this.getSignalLevel(network.rssi)),
      );

      networkIcons.append(lockIcon, signalIcon);
      networkButton.append(networkName, networkIcons);
      networkItem.appendChild(networkButton);
      this.networkList.appendChild(networkItem);
    });
  }

  buildNetworkListSignature(networks) {
    return networks
      .map((network) => {
        const security = network.secure ? "secure" : "open";
        const signalLevel = this.getSignalLevel(network.rssi);
        const connection = this.isConnectedNetwork(network)
          ? "connected"
          : "available";
        return `${network.ssid}|${security}|${signalLevel}|${connection}`;
      })
      .join("\n");
  }

  updateNetworkSpinner() {
    this.networkSpinner.hidden = !this.isScanningWifi;
  }

  setWifiScanState(isScanningWifi) {
    this.isScanningWifi = isScanningWifi;

    if (isScanningWifi) {
      this.startWifiScanTimeout();
    } else {
      this.stopWifiScanTimeout();
    }

    this.updateNetworkSpinner();
    this.onWifiScanStateChanged?.(isScanningWifi);
  }

  startWifiScanTimeout() {
    this.stopWifiScanTimeout();
    this.wifiScanTimeout = window.setTimeout(() => {
      if (!this.isScanningWifi) {
        return;
      }

      this.networkListMessage.textContent =
        "Wi-Fi scan timed out. Try scanning again.";
      this.scanNetworksButton.disabled = false;
      this.scanNetworksButton.textContent = "Scan Networks";
      this.pendingScanNetworks = [];
      this.setWifiScanState(false);
    }, WIFI_SCAN_TIMEOUT_MS);
  }

  stopWifiScanTimeout() {
    if (!this.wifiScanTimeout) {
      return;
    }

    window.clearTimeout(this.wifiScanTimeout);
    this.wifiScanTimeout = null;
  }

  selectNetwork(network) {
    if (this.isConnectedNetwork(network)) {
      this.closeWifiDialog();
      this.networkListMessage.textContent =
        `${network.ssid} is already connected.`;
      return;
    }

    this.selectedNetwork = network;
    this.openSelectedNetworkDialog(network);
  }

  openSelectedNetworkDialog(network) {
    this.wifiDialogTitle.textContent = `Connect to ${network.ssid}`;
    this.showWifiDialogMessage(
      network.secure ? "" : "This is an open network. No password is required.",
    );
    this.wifiSsidLabel.hidden = true;
    this.wifiPasswordLabel.hidden = !network.secure;
    this.wifiSsid.value = network.ssid;
    this.wifiPassword.value = "";
    this.wifiDialog.hidden = false;
    this.isConnectingWifi = false;
    this.setWifiDialogInputsDisabled(false);
    this.updateWifiConnectButton();

    if (network.secure) {
      this.wifiPassword.focus();
    } else {
      this.connectWifiButton.focus();
    }
  }

  openManualNetworkDialog() {
    this.selectedNetwork = null;
    this.wifiDialogTitle.textContent = "Other Network";
    this.clearWifiDialogMessage();
    this.wifiSsidLabel.hidden = false;
    this.wifiPasswordLabel.hidden = false;
    this.wifiSsid.value = "";
    this.wifiPassword.value = "";
    this.wifiDialog.hidden = false;
    this.isConnectingWifi = false;
    this.setWifiDialogInputsDisabled(false);
    this.updateWifiConnectButton();
    this.wifiSsid.focus();
  }

  closeWifiDialog() {
    if (this.isConnectingWifi) {
      return;
    }

    this.selectedNetwork = null;
    this.wifiDialog.hidden = true;
    this.wifiSsidLabel.hidden = false;
    this.wifiPasswordLabel.hidden = false;
    this.wifiSsid.value = "";
    this.wifiPassword.value = "";
    this.setWifiDialogInputsDisabled(false);
    this.clearWifiDialogMessage();
    this.updateWifiConnectButton();
  }

  updateWifiConnectButton() {
    if (this.wifiDialog.hidden || this.isConnectingWifi) {
      this.connectWifiButton.disabled = true;
      return;
    }

    const hasNetworkName = this.wifiSsid.value.trim().length > 0;
    const hasPassword = this.wifiPassword.value.length > 0;

    this.connectWifiButton.disabled = this.selectedNetwork
      ? this.selectedNetwork.secure && !hasPassword
      : !hasNetworkName || !hasPassword;
  }

  getSignalLevel(rssi) {
    if (rssi >= -50) {
      return 4;
    }

    if (rssi >= -67) {
      return 3;
    }

    if (rssi >= -75) {
      return 2;
    }

    return 1;
  }

  getSignalLabel(rssi) {
    if (rssi >= -50) {
      return "Strong signal";
    }

    if (rssi >= -67) {
      return "Good signal";
    }

    if (rssi >= -75) {
      return "Weak signal";
    }

    return "Poor signal";
  }

  setConnectedWifiSsid(wifiSsid) {
    const previousWifiSsid = this.connectedWifiSsid;
    this.connectedWifiSsid = wifiSsid || "";

    if (this.pendingWifiSsid && !this.connectedWifiSsid) {
      this.wifiConnectionInterrupted = true;
    }

    if (this.pendingWifiSsid && this.connectedWifiSsid) {
      if (this.connectedWifiSsid === this.pendingWifiSsid) {
        this.finishWifiConnectionAttempt();
      } else if (
        this.wifiConnectionInterrupted &&
        this.connectedWifiSsid !== previousWifiSsid
      ) {
        this.showWifiConnectionError(
          this.pendingWifiSsid,
          this.getWifiConnectionErrorMessage(this.pendingWifiSsid),
        );
      }
    }

    this.renderNetworkList(this.scannedNetworks);
  }

  isConnectedNetwork(network) {
    return this.isConnectedSsid(network.ssid);
  }

  isConnectedSsid(ssid) {
    return (
      this.connectedWifiSsid.length > 0 &&
      ssid === this.connectedWifiSsid
    );
  }

  handleDisconnect(device) {
    if (device && this.bleDevice && device.id !== this.bleDevice.id) {
      return;
    }

    this.setWifiScanState(false);
    this.stopWifiConnectionTimeout();
    this.stopWifiForgetTimeout();
    this.stopSetupSessionHeartbeat();
    this.setupSessionId = "";
    this.bleDevice = null;
    this.wifiSsidCharacteristic = null;
    this.wifiPasswordCharacteristic = null;
    this.commandCharacteristic = null;
    this.scanResultsCharacteristic = null;
    this.setupSessionCharacteristic = null;
    this.pendingWifiSsid = "";
    this.wifiConnectionInterrupted = false;
    this.isConnectingWifi = false;
    this.isForgettingWifi = false;
    this.bleDeviceName.textContent = "Connect Posture Pad";
    this.bleMessage.textContent =
      "Make sure your device is powered on and nearby.";
    this.bleDeviceDetails.hidden = true;
    this.closeWifiDialog();
    this.connectWifiButton.disabled = true;
    this.connectBleButton.disabled = false;
    this.connectBleButton.textContent = "Connect Posture Pad";
    this.scanNetworksButton.disabled = true;
    this.otherNetworkButton.disabled = true;
    this.switchDeviceButton.hidden = true;
    this.switchDeviceButton.disabled = true;
    this.forgetWifiButton.hidden = true;
    this.scanNetworksButton.textContent = "Scan Networks";
    this.networkList.replaceChildren();
    this.scannedNetworks = [];
    this.pendingScanNetworks = [];
    this.networkListSignature = "";

    if (!this.isSwitchingDevice) {
      this.onDeviceDisconnected?.();
    }
  }

  startWifiConnectionAttempt(ssid) {
    this.pendingWifiSsid = ssid;
    this.wifiConnectionInterrupted = false;
    this.isConnectingWifi = true;
    this.startWifiConnectionTimeout(ssid);
    this.wifiDialogMessage.classList.remove("error");
    this.wifiDialogMessage.textContent = `Connecting to "${ssid}"...`;
    this.setWifiDialogInputsDisabled(true);
    this.cancelWifiButton.disabled = true;
    this.connectWifiButton.disabled = true;
    this.connectWifiButton.textContent = "Connecting...";
  }

  finishWifiConnectionAttempt() {
    this.pendingWifiSsid = "";
    this.wifiConnectionInterrupted = false;
    this.isConnectingWifi = false;
    this.stopWifiConnectionTimeout();
    this.cancelWifiButton.disabled = false;
    this.connectWifiButton.textContent = "Connect";
    this.setWifiDialogInputsDisabled(false);
    this.wifiSsid.value = "";
    this.wifiPassword.value = "";
    this.closeWifiDialog();
  }

  showWifiConnectionError(ssid, message) {
    this.pendingWifiSsid = "";
    this.wifiConnectionInterrupted = false;
    this.isConnectingWifi = false;
    this.stopWifiConnectionTimeout();
    this.wifiDialog.hidden = false;
    this.wifiDialogTitle.textContent = `Connect to ${ssid}`;
    this.wifiDialogMessage.classList.add("error");
    this.wifiDialogMessage.textContent = message;
    this.cancelWifiButton.disabled = false;
    this.connectWifiButton.textContent = "Connect";
    this.setWifiDialogInputsDisabled(false);
    this.updateWifiConnectButton();
    this.focusWifiDialogErrorInput();
  }

  clearWifiDialogMessage() {
    this.showWifiDialogMessage("");
  }

  showWifiDialogMessage(message, isError = false) {
    this.wifiDialogMessage.classList.toggle("error", isError);
    this.wifiDialogMessage.textContent = message;
  }

  setWifiDialogInputsDisabled(disabled) {
    this.wifiSsid.disabled = disabled;
    this.wifiPassword.disabled = disabled;
  }

  finishForgetWifiNetwork() {
    this.isForgettingWifi = false;
    this.stopWifiForgetTimeout();
    this.forgetWifiButton.disabled = false;
    this.forgetWifiButton.textContent = "Forget This Network...";
    this.bleMessage.textContent =
      "The saved Wi-Fi network was removed from this Posture Pad.";
    this.onWifiForgotten?.();
  }

  startWifiForgetTimeout() {
    this.stopWifiForgetTimeout();

    this.wifiForgetTimeout = window.setTimeout(() => {
      if (!this.isForgettingWifi) {
        return;
      }

      this.isForgettingWifi = false;
      this.forgetWifiButton.disabled = false;
      this.forgetWifiButton.textContent = "Forget This Network...";
      this.bleMessage.textContent =
        "Could not confirm that the Wi-Fi network was forgotten.";
    }, WIFI_FORGET_TIMEOUT_MS);
  }

  stopWifiForgetTimeout() {
    if (!this.wifiForgetTimeout) {
      return;
    }

    window.clearTimeout(this.wifiForgetTimeout);
    this.wifiForgetTimeout = null;
  }

  getWifiConnectionErrorMessage(ssid) {
    if (this.selectedNetwork && !this.selectedNetwork.secure) {
      return `Could not connect to "${ssid}". Try another network.`;
    }

    return `Could not connect to "${ssid}". Check the password and try again.`;
  }

  startWifiConnectionTimeout(ssid) {
    this.stopWifiConnectionTimeout();

    this.wifiConnectionTimeout = window.setTimeout(() => {
      if (!this.isConnectingWifi || this.pendingWifiSsid !== ssid) {
        return;
      }

      this.showWifiConnectionError(
        ssid,
        this.getWifiConnectionErrorMessage(ssid),
      );
    }, WIFI_CONNECTION_TIMEOUT_MS);
  }

  stopWifiConnectionTimeout() {
    if (!this.wifiConnectionTimeout) {
      return;
    }

    window.clearTimeout(this.wifiConnectionTimeout);
    this.wifiConnectionTimeout = null;
  }

  focusWifiDialogInput() {
    if (this.wifiPasswordLabel.hidden) {
      this.connectWifiButton.focus();
      return;
    }

    if (this.wifiSsidLabel.hidden) {
      this.wifiPassword.focus();
      return;
    }

    this.wifiSsid.focus();
  }

  focusWifiDialogErrorInput() {
    if (!this.wifiPasswordLabel.hidden) {
      this.wifiPassword.focus();
      this.wifiPassword.select();
      return;
    }

    this.connectWifiButton.focus();
  }

  async claimSetupSession(deviceId) {
    this.setupSessionId = this.createSetupSessionId();

    await this.commandCharacteristic.writeValueWithResponse(
      new TextEncoder().encode(`claim:${this.setupSessionId}`),
    );

    const sessionStatusValue = await this.setupSessionCharacteristic.readValue();
    const sessionStatus = new TextDecoder().decode(sessionStatusValue);
    const expectedStatus = `claimed:${this.setupSessionId}`;

    if (sessionStatus !== expectedStatus) {
      console.warn(
        `Posture Pad ${deviceId} setup session rejected: ${sessionStatus}`,
      );
      this.setupSessionId = "";
      return false;
    }

    this.startSetupSessionHeartbeat();
    return true;
  }

  showBusyDeviceMessage(deviceId) {
    this.setWifiScanState(false);
    this.bleDeviceName.textContent = `Posture Pad ${deviceId.slice(-6)}`;
    this.bleMessage.textContent =
      "This Posture Pad is already being configured in another browser.";
    this.bleDeviceDetails.hidden = true;
    this.closeWifiDialog();
    this.connectBleButton.disabled = false;
    this.connectBleButton.textContent = "Try Again";
    this.connectWifiButton.disabled = true;
    this.scanNetworksButton.disabled = true;
    this.otherNetworkButton.disabled = true;
    this.switchDeviceButton.hidden = true;
    this.switchDeviceButton.disabled = true;
    this.forgetWifiButton.hidden = true;
    this.scanNetworksButton.textContent = "Scan Networks";
    this.networkList.replaceChildren();
    this.scannedNetworks = [];
    this.pendingScanNetworks = [];
    this.networkListSignature = "";
  }

  startSetupSessionHeartbeat() {
    this.stopSetupSessionHeartbeat();
    this.setupSessionHeartbeat = window.setInterval(() => {
      this.sendSetupSessionHeartbeat();
    }, 5000);
  }

  stopSetupSessionHeartbeat() {
    if (!this.setupSessionHeartbeat) {
      return;
    }

    window.clearInterval(this.setupSessionHeartbeat);
    this.setupSessionHeartbeat = null;
  }

  async sendSetupSessionHeartbeat() {
    if (!this.commandCharacteristic || !this.setupSessionId || this.isScanningWifi) {
      return;
    }

    try {
      await this.commandCharacteristic.writeValueWithResponse(
        new TextEncoder().encode(`ping:${this.setupSessionId}`),
      );
    } catch (error) {
      console.error("Could not refresh BLE setup session:", error);
    }
  }

  async releaseSetupSession() {
    if (!this.commandCharacteristic || !this.setupSessionId) {
      return;
    }

    try {
      await this.commandCharacteristic.writeValueWithResponse(
        new TextEncoder().encode(`release:${this.setupSessionId}`),
      );
    } catch {
      // The page may already be unloading or the BLE link may already be gone.
    }
  }

  createSetupSessionId() {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);

    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  }
}
