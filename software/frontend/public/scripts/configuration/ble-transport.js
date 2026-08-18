import {
  BLE_SERVICE_UUID,
  COMMAND_UUID,
  DEVICE_ID_UUID,
  PAIRING_TOKEN_UUID,
  SETUP_SESSION_UUID,
  STATUS_UUID,
  WIFI_PASSWORD_UUID,
  WIFI_SCAN_RESULTS_UUID,
  WIFI_SSID_UUID,
} from "../config/constants.js";

const CHARACTERISTIC_UUIDS = {
  deviceId: DEVICE_ID_UUID,
  pairingToken: PAIRING_TOKEN_UUID,
  status: STATUS_UUID,
  wifiSsid: WIFI_SSID_UUID,
  wifiPassword: WIFI_PASSWORD_UUID,
  command: COMMAND_UUID,
  scanResults: WIFI_SCAN_RESULTS_UUID,
  setupSession: SETUP_SESSION_UUID,
};

export class BleTransport {
  constructor({ onDisconnected } = {}) {
    this.onDisconnected = onDisconnected;
    this.device = null;
    this.characteristics = new Map();
    this.disconnectNotificationsEnabled = false;
    this.handleGattServerDisconnected =
      this.handleGattServerDisconnected.bind(this);
  }

  isSupported() {
    return Boolean(globalThis.navigator?.bluetooth);
  }

  async requestDevice() {
    return navigator.bluetooth.requestDevice({
      filters: [{ services: [BLE_SERVICE_UUID] }],
    });
  }

  async connect(device) {
    this.clear();
    this.device = device;
    this.device.addEventListener(
      "gattserverdisconnected",
      this.handleGattServerDisconnected,
    );

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(BLE_SERVICE_UUID);

    for (const [name, uuid] of Object.entries(CHARACTERISTIC_UUIDS)) {
      this.characteristics.set(name, await service.getCharacteristic(uuid));
    }
  }

  enableDisconnectNotifications() {
    this.disconnectNotificationsEnabled = true;
  }

  disconnect() {
    if (this.device?.gatt.connected) {
      this.device.gatt.disconnect();
    }
  }

  isConnected() {
    return Boolean(this.device?.gatt.connected);
  }

  getDeviceName() {
    return this.device?.name ?? "";
  }

  hasEndpoint(name) {
    return this.characteristics.has(name);
  }

  async readText(name) {
    const value = await this.getCharacteristic(name).readValue();
    return new TextDecoder().decode(value);
  }

  async writeText(name, value) {
    await this.getCharacteristic(name).writeValueWithResponse(
      new TextEncoder().encode(value),
    );
  }

  async subscribeText(name, handler) {
    const characteristic = this.getCharacteristic(name);

    characteristic.addEventListener(
      "characteristicvaluechanged",
      (event) => {
        handler(new TextDecoder().decode(event.target.value));
      },
    );
    await characteristic.startNotifications();
  }

  clear() {
    if (this.device) {
      this.device.removeEventListener(
        "gattserverdisconnected",
        this.handleGattServerDisconnected,
      );
    }

    this.device = null;
    this.characteristics.clear();
    this.disconnectNotificationsEnabled = false;
  }

  getCharacteristic(name) {
    const characteristic = this.characteristics.get(name);

    if (!characteristic) {
      throw new Error(`BLE characteristic is not available: ${name}`);
    }

    return characteristic;
  }

  handleGattServerDisconnected(event) {
    const disconnectedDevice = event.currentTarget;

    if (
      disconnectedDevice &&
      this.device &&
      disconnectedDevice.id !== this.device.id
    ) {
      return;
    }

    const shouldNotify = this.disconnectNotificationsEnabled;
    this.clear();

    if (shouldNotify) {
      this.onDisconnected?.(disconnectedDevice);
    }
  }
}
