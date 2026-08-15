import { BleTransport } from "../network/ble/ble-transport.js";
import { SetupSession } from "../network/ble/setup-session.js";
import { WifiSetupController } from "../network/wifi/wifi-setup-controller.js";
import { ProvisioningControlsView } from "../ui/provisioning-controls-view.js";
import { WifiCredentialsDialogView } from "../ui/wifi-credentials-dialog-view.js";
import { WifiNetworkListView } from "../ui/wifi-network-list-view.js";

export class DeviceSetupController {
  constructor({
    onDeviceConnected,
    onDeviceDisconnected,
    onWifiConnected,
    onWifiForgotten,
    onWifiScanStateChanged,
  }) {
    this.onDeviceConnected = onDeviceConnected;
    this.onDeviceDisconnected = onDeviceDisconnected;
    this.bleTransport = new BleTransport({
      onDisconnected: (device) => {
        this.handleDisconnect(device);
      },
    });
    this.setupSession = new SetupSession({
      bleTransport: this.bleTransport,
    });
    this.wifiCallbacks = {
      onWifiConnected,
      onWifiForgotten,
      onWifiScanStateChanged,
    };
  }

  init() {
    this.controlsView = new ProvisioningControlsView();
    this.wifiDialogView = new WifiCredentialsDialogView({
      onSubmit: (credentials) => {
        this.wifiSetupController.connect(credentials);
      },
      onCancel: () => {
        this.wifiSetupController.closeDialog();
      },
    });
    this.networkListView = new WifiNetworkListView({
      onNetworkSelected: (network) => {
        this.wifiSetupController.selectNetwork(network);
      },
    });
    this.wifiSetupController = new WifiSetupController({
      bleTransport: this.bleTransport,
      setupSession: this.setupSession,
      controlsView: this.controlsView,
      wifiDialogView: this.wifiDialogView,
      networkListView: this.networkListView,
      ...this.wifiCallbacks,
    });

    this.controlsView.bind({
      onConnectDevice: () => {
        this.connectDevice();
      },
      onScanNetworks: () => {
        this.wifiSetupController.scan();
      },
      onOtherNetwork: () => {
        this.wifiSetupController.openManualNetworkDialog();
      },
      onForgetWifi: () => {
        this.wifiSetupController.forget();
      },
      onSwitchDevice: () => {
        this.switchDevice();
      },
    });

    window.addEventListener("pagehide", () => {
      this.releaseSetupSession();
    });
  }

  async connectDevice() {
    if (!this.bleTransport.isSupported()) {
      this.controlsView.showBluetoothUnsupported();
      return;
    }

    this.controlsView.showChoosingDevice();

    try {
      const device = await this.requestBluetoothDevice();
      await this.connectSelectedDevice(device);
    } catch (error) {
      console.error("Bluetooth connection failed:", error);
      await this.releaseSetupSession();
      this.setupSession.clearLocal();
      this.controlsView.showConnectionFailed();
    }
  }

  async switchDevice() {
    this.controlsView.showSwitchingDevice();

    try {
      await this.releaseSetupSession();
      this.setupSession.clearLocal();

      if (this.bleTransport.isConnected()) {
        this.bleTransport.disconnect();
      }
    } catch (error) {
      console.error("Could not disconnect Posture Pad:", error);
    } finally {
      this.reloadConfigurationPage();
    }
  }

  reloadConfigurationPage() {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}#configuration`,
    );
    window.location.reload();
  }

  async requestBluetoothDevice() {
    return this.bleTransport.requestDevice();
  }

  async connectSelectedDevice(device) {
    await this.bleTransport.connect(device);

    const deviceId = await this.bleTransport.readText("deviceId");
    const statusValue = await this.bleTransport.readText("status");

    const setupSessionClaimed = await this.setupSession.claim(deviceId);

    if (!setupSessionClaimed) {
      this.showBusyDeviceMessage(deviceId);
      this.bleTransport.disconnect();
      return;
    }

    this.bleTransport.enableDisconnectNotifications();

    const pairingToken = await this.bleTransport.readText("pairingToken");

    await this.bleTransport.subscribeText(
      "status",
      (status) => {
        this.wifiSetupController.handleWifiStatus(status);
      },
    );
    await this.bleTransport.subscribeText(
      "scanResults",
      (scanResults) => {
        this.wifiSetupController.handleScanResults(scanResults);
      },
    );

    this.onDeviceConnected(deviceId, pairingToken);

    this.controlsView.showDeviceReady({
      name: this.bleTransport.getDeviceName(),
      deviceId,
      hasKnownWifiNetwork: this.wifiSetupController.hasKnownWifiNetwork(),
    });
    this.wifiSetupController.closeDialog();
    this.wifiSetupController.handleWifiStatus(statusValue);
    this.wifiSetupController.scan();
  }

  handleDisconnect() {
    this.wifiSetupController.resetForDisconnect();
    this.setupSession.clearLocal();
    this.bleTransport.clear();
    this.controlsView.showDisconnected();

    this.onDeviceDisconnected?.();
  }

  showBusyDeviceMessage(deviceId) {
    this.wifiSetupController.resetForBusyDevice();
    this.controlsView.showBusyDevice(deviceId);
  }

  syncObservedWifiSsid(wifiSsid) {
    this.wifiSetupController?.syncConnectedWifiSsid(wifiSsid);
  }

  async releaseSetupSession() {
    await this.setupSession.release();
  }
}
