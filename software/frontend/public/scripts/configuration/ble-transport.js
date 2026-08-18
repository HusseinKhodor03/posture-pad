const BLE_SERVICE_UUID = "e1a87d62-5df4-42f4-9cf9-fe3b312a8d85";
const DEVICE_ID_UUID = "31c794a4-7189-4023-beb7-f908f31e6224";
const WIFI_SSID_UUID = "426b1b2a-c11b-49c2-9053-1ba2afc1f6c1";
const WIFI_PASSWORD_UUID = "ff386352-081f-4803-b256-c0fba4085d2d";
const COMMAND_UUID = "1d831e2f-0ca5-4bf4-9f84-39487ad6b635";
const STATUS_UUID = "079a5b9b-eb37-49ff-b11b-fa3c68efd8f8";
const WIFI_SCAN_RESULTS_UUID = "7f9c0b60-9f79-46f6-8e2e-4f9c7d2c7c6d";
const PAIRING_TOKEN_UUID = "8be0ef6e-118a-4bd3-90b7-83bcaea35b7f";
const SETUP_SESSION_UUID = "0ad025b5-07ca-49a8-b3f7-03865f5f924f";

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
