import {
  WIFI_CONNECTION_TIMEOUT_MS,
  WIFI_FORGET_TIMEOUT_MS,
  WIFI_SCAN_TIMEOUT_MS,
} from "../config/constants.js";
import { WifiCredentialsDialogView } from "../ui/wifi-credentials-dialog-view.js";
import { WifiNetworkListView } from "../ui/wifi-network-list-view.js";
import { BleTransport } from "./ble/ble-transport.js";
import { SetupSession } from "./ble/setup-session.js";
import {
  buildConnectCommand,
  buildForgetCommand,
  buildScanCommand,
  buildScanPageCommand,
  parseScanResults,
  parseWifiStatus,
  validateWifiCredentials,
} from "./ble/ble-provisioning-protocol.js";

export class BleProvisioner {
  constructor({
    onDeviceConnected,
    onDeviceDisconnected,
    onWifiConnected,
    onWifiForgotten,
    onWifiScanStateChanged,
  }) {
    this.onDeviceConnected = onDeviceConnected;
    this.onDeviceDisconnected = onDeviceDisconnected;
    this.onWifiConnected = onWifiConnected;
    this.onWifiForgotten = onWifiForgotten;
    this.onWifiScanStateChanged = onWifiScanStateChanged;
    this.bleTransport = new BleTransport({
      onDisconnected: (device) => {
        this.handleDisconnect(device);
      },
    });
    this.setupSession = new SetupSession({
      bleTransport: this.bleTransport,
    });
    this.wifiScanTimeout = null;
    this.wifiConnectionTimeout = null;
    this.wifiForgetTimeout = null;
    this.selectedNetwork = null;
    this.scannedNetworks = [];
    this.pendingScanNetworks = [];
    this.connectedWifiSsid = "";
    this.pendingWifiSsid = "";
    this.wifiConnectionInterrupted = false;
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
    this.wifiDialogView = new WifiCredentialsDialogView({
      onSubmit: (credentials) => {
        this.sendWifiCredentials(credentials);
      },
      onCancel: () => {
        this.closeWifiDialog();
      },
    });
    this.scanNetworksButton = document.getElementById("scanNetworksButton");
    this.otherNetworkButton = document.getElementById("otherNetworkButton");
    this.forgetWifiButton = document.getElementById("forgetWifiButton");
    this.switchDeviceButton = document.getElementById("switchDeviceButton");
    this.networkSpinner = document.getElementById("networkSpinner");
    this.networkListView = new WifiNetworkListView({
      onNetworkSelected: (network) => {
        if (!this.isConnectingWifi) {
          this.selectNetwork(network);
        }
      },
    });

    this.connectBleButton.addEventListener("click", () => {
      this.connectDevice();
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

    window.addEventListener("pagehide", () => {
      this.releaseSetupSession();
    });
  }

  async connectDevice() {
    if (!this.bleTransport.isSupported()) {
      this.bleMessage.textContent =
        "This browser does not support Web Bluetooth. Try Chrome or Edge.";
      return;
    }

    this.connectBleButton.disabled = true;
    this.bleMessage.classList.remove("error");
    this.bleMessage.textContent =
      "Choose your Posture Pad from the browser prompt.";

    try {
      const device = await this.requestBluetoothDevice();
      await this.connectSelectedDevice(device);
    } catch (error) {
      console.error("Bluetooth connection failed:", error);
      await this.releaseSetupSession();
      this.setupSession.clearLocal();
      this.bleMessage.textContent =
        "Make sure your device is powered on and nearby.";
      this.connectBleButton.disabled = false;
    }
  }

  async switchDevice() {
    this.disableSetupButtonsForSwitch();
    this.bleMessage.textContent =
      "Disconnecting current Posture Pad...";

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

  disableSetupButtonsForSwitch() {
    this.scanNetworksButton.disabled = true;
    this.otherNetworkButton.disabled = true;
    this.forgetWifiButton.disabled = true;
    this.switchDeviceButton.disabled = true;
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
        this.handleWifiStatusChange(status);
      },
    );
    await this.bleTransport.subscribeText(
      "scanResults",
      (scanResults) => {
        this.handleScanResultsChange(scanResults);
      },
    );

    this.onDeviceConnected(deviceId, pairingToken);

    this.bleDeviceName.textContent = this.bleTransport.getDeviceName();
    this.bleDeviceId.textContent = deviceId;
    this.bleDeviceDetails.hidden = false;
    this.closeWifiDialog();
    this.bleMessage.classList.remove("error");
    this.bleMessage.textContent = "Your Posture Pad is ready for Wi-Fi setup.";
    this.updateWifiStatus(statusValue);
    this.connectBleButton.textContent = "Connected";
    this.scanWifiNetworks();
  }

  async sendWifiCredentials(credentials = this.wifiDialogView.getCredentials()) {
    if (this.isConnectingWifi) {
      return;
    }

    const { ssid, password } = credentials;
    const validation = validateWifiCredentials(ssid, password);

    if (!validation.isValid && validation.reason === "emptySsid") {
      this.bleMessage.textContent = "Enter a Wi-Fi network name.";
      return;
    }

    if (!validation.isValid && validation.reason === "tooLong") {
      this.bleMessage.textContent =
        "The network name or password is too long.";
      return;
    }

    if (this.isConnectedSsid(ssid)) {
      this.wifiDialogView.showMessage(`"${ssid}" is already connected.`, {
        isError: true,
      });
      this.wifiDialogView.updateSubmitState();
      this.wifiDialogView.focusInput();
      return;
    }

    try {
      this.startWifiConnectionAttempt(ssid);
      await this.bleTransport.writeText("wifiSsid", ssid);
      await this.bleTransport.writeText("wifiPassword", password);
      await this.bleTransport.writeText(
        "command",
        buildConnectCommand(this.setupSession.getSessionId()),
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
    if (!this.bleTransport.hasEndpoint("command") || this.isScanningWifi) {
      return;
    }

    this.scanNetworksButton.disabled = true;
    this.scanNetworksButton.textContent = "Scanning...";
    this.networkListView.showMessage("");
    this.networkListView.clear();
    this.scannedNetworks = [];
    this.pendingScanNetworks = [];
    this.closeWifiDialog();
    this.setWifiScanState(true);

    try {
      await this.bleTransport.writeText(
        "command",
        buildScanCommand(this.setupSession.getSessionId()),
      );
    } catch (error) {
      console.error("Could not start Wi-Fi scan:", error);
      this.networkListView.showMessage("Could not scan Wi-Fi networks.");
      this.scanNetworksButton.disabled = false;
      this.scanNetworksButton.textContent = "Scan Networks";
      this.setWifiScanState(false);
    }
  }

  async requestScanPage(page) {
    try {
      await this.bleTransport.writeText(
        "command",
        buildScanPageCommand(this.setupSession.getSessionId(), page),
      );
    } catch (error) {
      console.error("Could not request Wi-Fi scan page:", error);
      this.networkListView.showMessage(
        "Could not read Wi-Fi scan results.",
      );
      this.scanNetworksButton.disabled = false;
      this.scanNetworksButton.textContent = "Scan Networks";
      this.setWifiScanState(false);
    }
  }

  async forgetWifiNetwork() {
    if (
      !this.bleTransport.hasEndpoint("command") ||
      !this.setupSession.hasSession() ||
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
      await this.bleTransport.writeText(
        "command",
        buildForgetCommand(this.setupSession.getSessionId()),
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

  updateWifiStatus(statusValue) {
    const { status, wifiSsid } = parseWifiStatus(statusValue);

    this.bleDeviceStatus.textContent = status;

    if (status === "connecting") {
      this.bleMessage.textContent = "The Posture Pad is connecting to Wi-Fi...";
    } else if (status === "connected") {
      this.bleMessage.textContent = "The Posture Pad is connected to Wi-Fi.";
      if (wifiSsid) {
        this.setConnectedWifiSsid(wifiSsid);
        this.onWifiConnected?.(wifiSsid);
      }
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

  handleWifiStatusChange(statusValue) {
    this.updateWifiStatus(statusValue);
  }

  async handleScanResultsChange(scanResultText) {
    let scanResults;

    try {
      scanResults = parseScanResults(scanResultText);
    } catch (error) {
      console.error("Could not read Wi-Fi scan results:", error);
      this.networkListView.showMessage("Could not read Wi-Fi scan results.");
      this.scanNetworksButton.disabled = false;
      this.scanNetworksButton.textContent = "Scan Networks";
      this.setWifiScanState(false);
      return;
    }

    if (scanResults.status === "scanning") {
      if (this.isScanningWifi) {
        this.networkListView.showMessage("");
      }
      return;
    }

    if (scanResults.status !== "complete") {
      this.networkListView.showMessage("Could not scan Wi-Fi networks.");
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
    this.scannedNetworks = networks;
    this.networkListView.render(networks, {
      connectedWifiSsid: this.connectedWifiSsid,
    });
  }

  updateNetworkSpinner() {
    this.networkSpinner.hidden = !this.isScanningWifi;
  }

  setWifiScanState(isScanningWifi) {
    this.isScanningWifi = isScanningWifi;
    this.setupSession.setHeartbeatSuspended(isScanningWifi);

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

      this.networkListView.showMessage(
        "Wi-Fi scan timed out. Try scanning again.",
      );
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
    if (this.isConnectedSsid(network.ssid)) {
      this.closeWifiDialog();
      this.networkListView.showMessage(
        `${network.ssid} is already connected.`,
      );
      return;
    }

    this.selectedNetwork = network;
    this.openSelectedNetworkDialog(network);
  }

  openSelectedNetworkDialog(network) {
    this.wifiDialogView.openForNetwork(network);
    this.isConnectingWifi = false;
  }

  openManualNetworkDialog() {
    this.selectedNetwork = null;
    this.wifiDialogView.openManual();
    this.isConnectingWifi = false;
  }

  closeWifiDialog(options = {}) {
    if (!options.force && this.isConnectingWifi) {
      return;
    }

    this.selectedNetwork = null;
    this.wifiDialogView.close(options);
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

  isConnectedSsid(ssid) {
    return (
      this.connectedWifiSsid.length > 0 &&
      ssid === this.connectedWifiSsid
    );
  }

  handleDisconnect() {
    this.setWifiScanState(false);
    this.stopWifiConnectionTimeout();
    this.stopWifiForgetTimeout();
    this.setupSession.clearLocal();
    this.bleTransport.clear();
    this.pendingWifiSsid = "";
    this.wifiConnectionInterrupted = false;
    this.isConnectingWifi = false;
    this.isForgettingWifi = false;
    this.bleDeviceName.textContent = "Connect Device";
    this.bleMessage.classList.remove("error");
    this.bleMessage.textContent =
      "Make sure your device is powered on and nearby.";
    this.bleDeviceDetails.hidden = true;
    this.closeWifiDialog({ force: true });
    this.connectBleButton.disabled = false;
    this.connectBleButton.textContent = "Connect Device";
    this.scanNetworksButton.disabled = true;
    this.otherNetworkButton.disabled = true;
    this.switchDeviceButton.hidden = true;
    this.switchDeviceButton.disabled = true;
    this.forgetWifiButton.hidden = true;
    this.scanNetworksButton.textContent = "Scan Networks";
    this.networkListView.clear();
    this.scannedNetworks = [];
    this.pendingScanNetworks = [];

    this.onDeviceDisconnected?.();
  }

  startWifiConnectionAttempt(ssid) {
    this.pendingWifiSsid = ssid;
    this.wifiConnectionInterrupted = false;
    this.isConnectingWifi = true;
    this.startWifiConnectionTimeout(ssid);
    this.wifiDialogView.showConnecting(ssid);
  }

  finishWifiConnectionAttempt() {
    this.pendingWifiSsid = "";
    this.wifiConnectionInterrupted = false;
    this.isConnectingWifi = false;
    this.stopWifiConnectionTimeout();
    this.closeWifiDialog({ force: true });
  }

  showWifiConnectionError(ssid, message) {
    this.pendingWifiSsid = "";
    this.wifiConnectionInterrupted = false;
    this.isConnectingWifi = false;
    this.stopWifiConnectionTimeout();
    this.wifiDialogView.showConnectionError({
      ssid,
      message,
      isManual: !this.selectedNetwork,
    });
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
    return `Could not connect to "${ssid}".`;
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

  showBusyDeviceMessage(deviceId) {
    this.setWifiScanState(false);
    this.bleDeviceName.textContent = "Connect Device";
    this.bleMessage.classList.add("error");
    this.bleMessage.textContent =
      `PosturePad-${deviceId.slice(-6)} is already being configured in another browser.`;
    this.bleDeviceDetails.hidden = true;
    this.closeWifiDialog({ force: true });
    this.connectBleButton.disabled = false;
    this.connectBleButton.textContent = "Connect Device";
    this.scanNetworksButton.disabled = true;
    this.otherNetworkButton.disabled = true;
    this.switchDeviceButton.hidden = true;
    this.switchDeviceButton.disabled = true;
    this.forgetWifiButton.hidden = true;
    this.scanNetworksButton.textContent = "Scan Networks";
    this.networkListView.clear();
    this.scannedNetworks = [];
    this.pendingScanNetworks = [];
  }

  async releaseSetupSession() {
    await this.setupSession.release();
  }
}
