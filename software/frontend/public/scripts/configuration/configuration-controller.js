import { DeviceSetupController } from "../device/device-setup-controller.js";
import {
  clearSelectedDevice,
  formatDeviceLabel,
  loadSelectedDeviceId,
  selectDevice,
} from "../device/device-selection.js";
import { updateConfigView } from "../ui/config-view.js";

export class ConfigurationController {
  constructor({
    onDeviceConnected,
    onDeviceDisconnected,
    onWifiForgotten,
    onWifiScanStateChanged,
  } = {}) {
    if (loadSelectedDeviceId()) {
      clearSelectedDevice();
    }

    this.selectedDeviceId = null;
    this.selectedDeviceLabel = formatDeviceLabel(this.selectedDeviceId);
    this.selectedDeviceWifiSsid = "";
    this.isSetupConnected = false;
    this.onDeviceConnected = onDeviceConnected;
    this.onDeviceDisconnected = onDeviceDisconnected;
    this.onWifiForgotten = onWifiForgotten;
    this.onWifiScanStateChanged = onWifiScanStateChanged;
    this.deviceSetupController = new DeviceSetupController({
      onDeviceConnected: (deviceId, authToken) => {
        this.handleDeviceConnected(deviceId, authToken);
      },
      onDeviceDisconnected: () => {
        this.handleDeviceDisconnected();
      },
      onWifiConnected: (wifiSsid) => {
        this.handleWifiConnected(wifiSsid);
      },
      onWifiForgotten: () => {
        this.handleWifiForgotten();
      },
      onWifiScanStateChanged: (scanState) => {
        this.handleWifiScanStateChanged(scanState);
      },
    });

    this.renderStatus();
  }

  init() {
    this.deviceSetupController.init();
  }

  getDeviceLabel() {
    return this.selectedDeviceLabel;
  }

  syncObservedWifiSsid(wifiSsid) {
    this.selectedDeviceWifiSsid = wifiSsid || "";
    this.renderStatus();
    this.syncDeviceSetupObservedWifiSsid();
  }

  syncDeviceSetupObservedWifiSsid() {
    this.deviceSetupController.syncObservedWifiSsid(
      this.selectedDeviceWifiSsid,
    );
  }

  handleDeviceConnected(deviceId, authToken) {
    const isSameDevice = this.selectedDeviceId === deviceId;
    this.selectedDeviceId = deviceId;
    this.selectedDeviceLabel = formatDeviceLabel(this.selectedDeviceId);
    this.selectedDeviceWifiSsid = isSameDevice
      ? this.selectedDeviceWifiSsid
      : "";
    this.isSetupConnected = true;
    selectDevice(this.selectedDeviceId);

    this.onDeviceConnected?.({
      deviceId,
      deviceLabel: this.selectedDeviceLabel,
      authToken,
      isSameDevice,
    });

    this.renderStatus();
    this.syncDeviceSetupObservedWifiSsid();
  }

  handleDeviceDisconnected() {
    this.selectedDeviceId = null;
    this.selectedDeviceLabel = formatDeviceLabel(this.selectedDeviceId);
    this.selectedDeviceWifiSsid = "";
    this.isSetupConnected = false;
    clearSelectedDevice();

    this.onDeviceDisconnected?.({
      deviceLabel: this.selectedDeviceLabel,
    });

    this.renderStatus();
    this.syncDeviceSetupObservedWifiSsid();
  }

  handleWifiConnected(wifiSsid) {
    this.selectedDeviceWifiSsid = wifiSsid || "";
    this.renderStatus();
  }

  handleWifiForgotten() {
    this.selectedDeviceWifiSsid = "";

    this.onWifiForgotten?.({
      deviceLabel: this.selectedDeviceLabel,
    });

    this.renderStatus();
    this.syncDeviceSetupObservedWifiSsid();
  }

  handleWifiScanStateChanged(scanState) {
    this.onWifiScanStateChanged?.(scanState);
    this.renderStatus();
  }

  renderStatus() {
    updateConfigView({
      deviceLabel: this.selectedDeviceLabel,
      deviceId: this.selectedDeviceId,
      hasSelectedDevice: Boolean(this.selectedDeviceId),
      isSetupConnected: this.isSetupConnected,
      wifiSsid: this.selectedDeviceWifiSsid,
    });
  }
}
