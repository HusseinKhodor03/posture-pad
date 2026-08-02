import {
  BLE_SERVICE_UUID,
  COMMAND_UUID,
  DEVICE_ID_UUID,
  PAIRING_TOKEN_UUID,
  STATUS_UUID,
  WIFI_PASSWORD_UUID,
  WIFI_SCAN_RESULTS_UUID,
  WIFI_SSID_UUID,
} from "../config/constants.js";
import { createWifiSignalIcon } from "../ui/wifi-signal-icon.js";

export class BleProvisioner {
  constructor({ onDeviceConnected, onDeviceDisconnected }) {
    this.onDeviceConnected = onDeviceConnected;
    this.onDeviceDisconnected = onDeviceDisconnected;
    this.wifiSsidCharacteristic = null;
    this.wifiPasswordCharacteristic = null;
    this.commandCharacteristic = null;
    this.scanResultsCharacteristic = null;
    this.selectedNetwork = null;
    this.scannedNetworks = [];
    this.networkListSignature = "";
  }

  init() {
    this.connectBleButton = document.getElementById("connectBleButton");
    this.bleStatus = document.getElementById("bleStatus");
    this.bleDeviceName = document.getElementById("bleDeviceName");
    this.bleMessage = document.getElementById("bleMessage");
    this.bleDeviceDetails = document.getElementById("bleDeviceDetails");
    this.bleDeviceId = document.getElementById("bleDeviceId");
    this.bleDeviceStatus = document.getElementById("bleDeviceStatus");
    this.wifiDialog = document.getElementById("wifiDialog");
    this.wifiDialogTitle = document.getElementById("wifiDialogTitle");
    this.wifiSsidLabel = document.getElementById("wifiSsidLabel");
    this.wifiSsid = document.getElementById("wifiSsid");
    this.wifiPassword = document.getElementById("wifiPassword");
    this.connectWifiButton = document.getElementById("connectWifiButton");
    this.cancelWifiButton = document.getElementById("cancelWifiButton");
    this.scanNetworksButton = document.getElementById("scanNetworksButton");
    this.otherNetworkButton = document.getElementById("otherNetworkButton");
    this.networkListMessage = document.getElementById("networkListMessage");
    this.networkList = document.getElementById("networkList");

    this.connectBleButton.addEventListener("click", () => {
      this.connectDevice();
    });

    this.connectWifiButton.addEventListener("click", () => {
      this.sendWifiCredentials();
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

    this.networkList.addEventListener("click", (event) => {
      const networkButton = event.target.closest(".networkListButton");

      if (!networkButton) {
        return;
      }

      const networkIndex = Number(networkButton.dataset.networkIndex);
      const network = this.scannedNetworks[networkIndex];

      if (network) {
        this.selectNetwork(network);
      }
    });
  }

  async connectDevice() {
    if (!navigator.bluetooth) {
      this.bleStatus.textContent = "Bluetooth unavailable";
      this.bleMessage.textContent =
        "This browser does not support Web Bluetooth. Try Chrome or Edge.";
      return;
    }

    this.connectBleButton.disabled = true;
    this.bleStatus.textContent = "Setup";
    this.bleMessage.textContent =
      "Choose your Posture Pad from the browser prompt.";

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BLE_SERVICE_UUID] }],
      });

      device.addEventListener("gattserverdisconnected", () => {
        this.handleDisconnect();
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(BLE_SERVICE_UUID);
      const deviceIdCharacteristic =
        await service.getCharacteristic(DEVICE_ID_UUID);
      const pairingTokenCharacteristic =
        await service.getCharacteristic(PAIRING_TOKEN_UUID);
      const statusCharacteristic =
        await service.getCharacteristic(STATUS_UUID);
      this.wifiSsidCharacteristic =
        await service.getCharacteristic(WIFI_SSID_UUID);
      this.wifiPasswordCharacteristic =
        await service.getCharacteristic(WIFI_PASSWORD_UUID);
      this.commandCharacteristic =
        await service.getCharacteristic(COMMAND_UUID);
      this.scanResultsCharacteristic =
        await service.getCharacteristic(WIFI_SCAN_RESULTS_UUID);

      const deviceIdValue = await deviceIdCharacteristic.readValue();
      const pairingTokenValue = await pairingTokenCharacteristic.readValue();
      const statusValue = await statusCharacteristic.readValue();
      const decoder = new TextDecoder();

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

      const deviceId = decoder.decode(deviceIdValue);
      const pairingToken = decoder.decode(pairingTokenValue);
      this.onDeviceConnected(deviceId, pairingToken);

      this.bleDeviceName.textContent = device.name;
      this.bleDeviceId.textContent = deviceId;
      this.bleDeviceDetails.hidden = false;
      this.closeWifiDialog();
      this.connectWifiButton.disabled = false;
      this.otherNetworkButton.disabled = false;
      this.bleStatus.textContent = "Setup";
      this.bleMessage.textContent =
        "Your Posture Pad is ready for Wi-Fi setup.";
      this.updateWifiStatus(decoder.decode(statusValue));
      this.connectBleButton.textContent = "Connected";
      this.scanNetworksButton.disabled = false;
      this.scanWifiNetworks();
    } catch (error) {
      console.error("Bluetooth connection failed:", error);
      this.bleStatus.textContent = "Setup";
      this.bleMessage.textContent = "Could not connect to the Posture Pad.";
      this.connectBleButton.disabled = false;
    }
  }

  async sendWifiCredentials(
    ssid = this.selectedNetwork?.ssid ?? this.wifiSsid.value.trim(),
    password = this.wifiPassword.value,
    button = this.connectWifiButton,
  ) {
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

    if (button) {
      button.disabled = true;
      button.textContent = "Sending...";
    }

    try {
      await this.wifiSsidCharacteristic.writeValueWithResponse(ssidValue);
      await this.wifiPasswordCharacteristic.writeValueWithResponse(
        passwordValue,
      );
      await this.commandCharacteristic.writeValueWithResponse(
        encoder.encode("connect"),
      );
      this.wifiSsid.value = "";
      this.wifiPassword.value = "";
      this.closeWifiDialog();

      if (this.bleDeviceStatus.textContent === "unconfigured") {
        this.bleMessage.textContent =
          "Wi-Fi credentials sent to the Posture Pad.";
      }
    } catch (error) {
      console.error("Could not send Wi-Fi credentials:", error);
      this.bleMessage.textContent = "Could not send the Wi-Fi credentials.";
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Connect to Wi-Fi";
      }
    }
  }

  async scanWifiNetworks() {
    if (!this.commandCharacteristic) {
      return;
    }

    this.scanNetworksButton.disabled = true;
    this.scanNetworksButton.textContent = "Scanning...";
    this.networkListMessage.textContent = "Scanning nearby networks...";
    this.networkList.replaceChildren();
    this.scannedNetworks = [];
    this.networkListSignature = "";
    this.closeWifiDialog();

    try {
      await this.commandCharacteristic.writeValueWithResponse(
        new TextEncoder().encode("scan_wifi"),
      );
    } catch (error) {
      console.error("Could not start Wi-Fi scan:", error);
      this.networkListMessage.textContent = "Could not scan Wi-Fi networks.";
      this.scanNetworksButton.disabled = false;
      this.scanNetworksButton.textContent = "Scan Networks";
    }
  }

  updateWifiStatus(status) {
    this.bleDeviceStatus.textContent = status;

    if (status === "connecting") {
      this.bleMessage.textContent = "The Posture Pad is connecting to Wi-Fi...";
    } else if (status === "connected") {
      this.bleMessage.textContent = "The Posture Pad is connected to Wi-Fi.";
    }
  }

  handleWifiStatusChange(event) {
    this.updateWifiStatus(new TextDecoder().decode(event.target.value));
  }

  async handleScanResultsChange(event) {
    let scanResults;

    try {
      const value = await event.target.readValue();
      const scanResultText = new TextDecoder().decode(value);
      scanResults = JSON.parse(scanResultText);
    } catch (error) {
      console.error("Could not read Wi-Fi scan results:", error);
      this.networkListMessage.textContent =
        "Could not read Wi-Fi scan results.";
      this.scanNetworksButton.disabled = false;
      this.scanNetworksButton.textContent = "Scan Networks";
      return;
    }

    if (scanResults.status === "scanning") {
      this.networkListMessage.textContent = "Scanning nearby networks...";
      return;
    }

    this.scanNetworksButton.disabled = false;
    this.scanNetworksButton.textContent = "Scan Networks";

    if (scanResults.status !== "complete") {
      this.networkListMessage.textContent = "Could not scan Wi-Fi networks.";
      return;
    }

    this.renderNetworkList(scanResults.networks ?? []);
  }

  renderNetworkList(networks) {
    const networkListSignature = this.buildNetworkListSignature(networks);
    const networkListChanged =
      networkListSignature !== this.networkListSignature;

    this.scannedNetworks = networks;

    if (!networkListChanged) {
      return;
    }

    this.networkListSignature = networkListSignature;
    this.networkList.replaceChildren();

    if (!networks.length) {
      this.networkListMessage.textContent = "No Wi-Fi networks found.";
      return;
    }

    this.networkListMessage.textContent =
      "Choose a network from the list below.";

    networks.forEach((network, index) => {
      const networkItem = document.createElement("li");
      networkItem.className = "networkListItem";

      const networkButton = document.createElement("button");
      networkButton.className = "networkListButton";
      networkButton.type = "button";
      networkButton.dataset.networkIndex = index;

      const networkName = document.createElement("span");
      networkName.className = "networkName";
      networkName.textContent = network.ssid;

      const networkIcons = document.createElement("span");
      networkIcons.className = "networkIcons";

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
        return `${network.ssid}|${security}|${signalLevel}`;
      })
      .join("\n");
  }

  selectNetwork(network) {
    this.selectedNetwork = network;

    if (!network.secure) {
      this.selectedNetwork = null;
      this.sendWifiCredentials(network.ssid, "", null);
      return;
    }

    this.openSelectedNetworkDialog(network);
  }

  openSelectedNetworkDialog(network) {
    this.wifiDialogTitle.textContent = `Connect to ${network.ssid}`;
    this.wifiSsidLabel.hidden = true;
    this.wifiSsid.value = network.ssid;
    this.wifiPassword.value = "";
    this.wifiDialog.hidden = false;
    this.wifiPassword.focus();
  }

  openManualNetworkDialog() {
    this.selectedNetwork = null;
    this.wifiDialogTitle.textContent = "Other Network";
    this.wifiSsidLabel.hidden = false;
    this.wifiSsid.value = "";
    this.wifiPassword.value = "";
    this.wifiDialog.hidden = false;
    this.wifiSsid.focus();
  }

  closeWifiDialog() {
    this.selectedNetwork = null;
    this.wifiDialog.hidden = true;
    this.wifiSsidLabel.hidden = false;
    this.wifiSsid.value = "";
    this.wifiPassword.value = "";
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

  handleDisconnect() {
    this.wifiSsidCharacteristic = null;
    this.wifiPasswordCharacteristic = null;
    this.commandCharacteristic = null;
    this.scanResultsCharacteristic = null;
    this.bleStatus.textContent = "Setup";
    this.bleMessage.textContent =
      "Connect your Posture Pad to configure Wi-Fi.";
    this.closeWifiDialog();
    this.connectWifiButton.disabled = true;
    this.connectBleButton.disabled = false;
    this.connectBleButton.textContent = "Reconnect Posture Pad";
    this.scanNetworksButton.disabled = true;
    this.otherNetworkButton.disabled = true;
    this.scanNetworksButton.textContent = "Scan Networks";
    this.networkList.replaceChildren();
    this.scannedNetworks = [];
    this.networkListSignature = "";
    this.onDeviceDisconnected?.();
  }
}
