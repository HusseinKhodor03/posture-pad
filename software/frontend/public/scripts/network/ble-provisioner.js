import {
  BLE_SERVICE_UUID,
  DEVICE_ID_UUID,
  WIFI_SSID_UUID,
  WIFI_PASSWORD_UUID,
  COMMAND_UUID,
  STATUS_UUID,
} from "../config/constants.js";

export class BleProvisioner {
  constructor({ onDeviceConnected }) {
    this.onDeviceConnected = onDeviceConnected;
    this.wifiSsidCharacteristic = null;
    this.wifiPasswordCharacteristic = null;
    this.commandCharacteristic = null;
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

    this.connectBleButton.addEventListener("click", () => {
      this.connectDevice();
    });

    this.connectWifiButton.addEventListener("click", () => {
      this.sendWifiCredentials();
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
    this.bleStatus.textContent = "Connecting...";
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

      const deviceId = decoder.decode(deviceIdValue);
      this.onDeviceConnected(deviceId);

      this.bleDeviceName.textContent = device.name;
      this.bleDeviceId.textContent = deviceId;
      this.bleDeviceDetails.hidden = false;
      this.wifiForm.hidden = false;
      this.connectWifiButton.disabled = false;
      this.bleStatus.textContent = "Connected";
      this.bleMessage.textContent =
        "Your Posture Pad is connected over Bluetooth.";
      this.updateWifiStatus(decoder.decode(statusValue));
      this.connectBleButton.textContent = "Connected";
    } catch (error) {
      console.error("Bluetooth connection failed:", error);
      this.bleStatus.textContent = "Not connected";
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

  handleDisconnect() {
    this.wifiSsidCharacteristic = null;
    this.wifiPasswordCharacteristic = null;
    this.commandCharacteristic = null;
    this.bleStatus.textContent = "Disconnected";
    this.bleMessage.textContent = "The Bluetooth connection was closed.";
    this.wifiForm.hidden = true;
    this.connectWifiButton.disabled = true;
    this.connectBleButton.disabled = false;
    this.connectBleButton.textContent = "Reconnect Posture Pad";
  }
}
