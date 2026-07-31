import {
  BLE_SERVICE_UUID,
  COMMAND_UUID,
  DEVICE_ID_UUID,
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
  }

  init() {
    this.connectBleButton = document.getElementById("connectBleButton");
    this.bleStatus = document.getElementById("bleStatus");
    this.bleDeviceName = document.getElementById("bleDeviceName");
    this.bleMessage = document.getElementById("bleMessage");
    this.bleDeviceDetails = document.getElementById("bleDeviceDetails");
    this.bleDeviceId = document.getElementById("bleDeviceId");
    this.bleDeviceStatus = document.getElementById("bleDeviceStatus");
    this.wifiForm = document.getElementById("wifiForm");
    this.wifiSsid = document.getElementById("wifiSsid");
    this.wifiPassword = document.getElementById("wifiPassword");
    this.connectWifiButton = document.getElementById("connectWifiButton");
    this.scanNetworksButton = document.getElementById("scanNetworksButton");
    this.networkListMessage = document.getElementById("networkListMessage");
    this.networkList = document.getElementById("networkList");

    this.connectBleButton.addEventListener("click", () => {
      this.connectDevice();
    });

    this.connectWifiButton.addEventListener("click", () => {
      this.sendWifiCredentials();
    });

    this.scanNetworksButton.addEventListener("click", () => {
      this.scanWifiNetworks();
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
      this.onDeviceConnected(deviceId);

      this.bleDeviceName.textContent = device.name;
      this.bleDeviceId.textContent = deviceId;
      this.bleDeviceDetails.hidden = false;
      this.wifiForm.hidden = false;
      this.connectWifiButton.disabled = false;
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

  async sendWifiCredentials() {
    const encoder = new TextEncoder();
    const ssidValue = encoder.encode(this.wifiSsid.value);
    const passwordValue = encoder.encode(this.wifiPassword.value);

    if (ssidValue.length === 0) {
      this.bleMessage.textContent = "Enter a Wi-Fi network name.";
      return;
    }

    if (ssidValue.length > 32 || passwordValue.length > 64) {
      this.bleMessage.textContent =
        "The network name or password is too long.";
      return;
    }

    this.connectWifiButton.disabled = true;
    this.connectWifiButton.textContent = "Sending...";

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

      if (this.bleDeviceStatus.textContent === "unconfigured") {
        this.bleMessage.textContent =
          "Wi-Fi credentials sent to the Posture Pad.";
      }
    } catch (error) {
      console.error("Could not send Wi-Fi credentials:", error);
      this.bleMessage.textContent = "Could not send the Wi-Fi credentials.";
    } finally {
      this.connectWifiButton.disabled = false;
      this.connectWifiButton.textContent = "Connect to Wi-Fi";
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
    this.networkList.replaceChildren();

    if (!networks.length) {
      this.networkListMessage.textContent = "No Wi-Fi networks found.";
      return;
    }

    this.networkListMessage.textContent =
      "Choose a network from the list below.";

    networks.forEach((network) => {
      const networkItem = document.createElement("li");
      networkItem.className = "networkListItem";

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
      networkItem.append(networkName, networkIcons);
      this.networkList.appendChild(networkItem);
    });
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
    this.wifiForm.hidden = true;
    this.connectWifiButton.disabled = true;
    this.connectBleButton.disabled = false;
    this.connectBleButton.textContent = "Reconnect Posture Pad";
    this.scanNetworksButton.disabled = true;
    this.scanNetworksButton.textContent = "Scan Networks";
    this.networkList.replaceChildren();
    this.onDeviceDisconnected?.();
  }
}
