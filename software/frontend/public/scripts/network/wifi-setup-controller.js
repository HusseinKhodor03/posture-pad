import {
  WIFI_CONNECTION_TIMEOUT_MS,
  WIFI_FORGET_TIMEOUT_MS,
  WIFI_SCAN_TIMEOUT_MS,
} from "../config/constants.js";
import {
  buildConnectCommand,
  buildForgetCommand,
  buildScanCommand,
  buildScanPageCommand,
  parseScanResults,
  parseWifiStatus,
  validateWifiCredentials,
} from "./ble-provisioning-protocol.js";

export class WifiSetupController {
  constructor({
    bleTransport,
    setupSession,
    controlsView,
    wifiDialogView,
    networkListView,
    onWifiConnected,
    onWifiForgotten,
    onWifiScanStateChanged,
  }) {
    this.bleTransport = bleTransport;
    this.setupSession = setupSession;
    this.controlsView = controlsView;
    this.wifiDialogView = wifiDialogView;
    this.networkListView = networkListView;
    this.onWifiConnected = onWifiConnected;
    this.onWifiForgotten = onWifiForgotten;
    this.onWifiScanStateChanged = onWifiScanStateChanged;

    this.wifiScanTimeout = null;
    this.wifiConnectionTimeout = null;
    this.wifiForgetTimeout = null;
    this.selectedNetwork = null;
    this.scannedNetworks = [];
    this.pendingScanNetworks = [];
    this.connectedWifiSsid = "";
    this.currentWifiStatus = "";
    this.pendingWifiSsid = "";
    this.wifiConnectionInterrupted = false;
    this.isScanningWifi = false;
    this.isConnectingWifi = false;
    this.isForgettingWifi = false;
  }

  async scan() {
    if (!this.bleTransport.hasEndpoint("command") || this.isScanningWifi) {
      return;
    }

    this.networkListView.showMessage("");
    this.networkListView.clear();
    this.scannedNetworks = [];
    this.pendingScanNetworks = [];
    this.closeDialog();
    this.setWifiScanState(true);

    try {
      await this.bleTransport.writeText(
        "command",
        buildScanCommand(this.setupSession.getSessionId()),
      );
    } catch (error) {
      console.error("Could not start Wi-Fi scan:", error);
      this.networkListView.showMessage("Could not scan Wi-Fi networks.");
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
      this.setWifiScanState(false);
    }
  }

  async connect(credentials = this.wifiDialogView.getCredentials()) {
    if (this.isConnectingWifi) {
      return;
    }

    const { ssid, password } = credentials;
    const validation = validateWifiCredentials(ssid, password);

    if (!validation.isValid && validation.reason === "emptySsid") {
      this.controlsView.showMessage("Enter a Wi-Fi network name.");
      return;
    }

    if (!validation.isValid && validation.reason === "tooLong") {
      this.controlsView.showMessage(
        "The network name or password is too long.",
      );
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

      if (this.currentWifiStatus === "unconfigured") {
        this.controlsView.showMessage(
          "Wi-Fi credentials sent to the Posture Pad.",
        );
      }
    } catch (error) {
      this.showWifiConnectionError(
        ssid,
        `Could not send Wi-Fi credentials for "${ssid}".`,
      );
      console.error("Could not send Wi-Fi credentials:", error);
      this.controlsView.showMessage("Could not send the Wi-Fi credentials.");
    }
  }

  async forget() {
    if (
      !this.bleTransport.hasEndpoint("command") ||
      !this.setupSession.hasSession() ||
      this.isForgettingWifi
    ) {
      return;
    }

    this.isForgettingWifi = true;
    this.startWifiForgetTimeout();
    this.controlsView.showForgetState(true);
    this.closeDialog();

    try {
      await this.bleTransport.writeText(
        "command",
        buildForgetCommand(this.setupSession.getSessionId()),
      );
    } catch (error) {
      console.error("Could not forget Wi-Fi network:", error);
      this.stopWifiForgetTimeout();
      this.controlsView.showMessage("Could not forget the Wi-Fi network.");
      this.isForgettingWifi = false;
      this.controlsView.showForgetState(false);
    }
  }

  handleWifiStatus(statusValue) {
    const { status, wifiSsid } = parseWifiStatus(statusValue);

    this.currentWifiStatus = status;
    this.controlsView.showWifiStatus(status);

    if (status === "connected") {
      if (wifiSsid) {
        this.syncConnectedWifiSsid(wifiSsid);
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

  async handleScanResults(scanResultText) {
    let scanResults;

    try {
      scanResults = parseScanResults(scanResultText);
    } catch (error) {
      console.error("Could not read Wi-Fi scan results:", error);
      this.networkListView.showMessage("Could not read Wi-Fi scan results.");
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

    this.setWifiScanState(false);
    this.renderNetworkList(this.pendingScanNetworks);
  }

  selectNetwork(network) {
    if (this.isConnectingWifi) {
      return;
    }

    if (this.isConnectedSsid(network.ssid)) {
      this.closeDialog();
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

  closeDialog(options = {}) {
    if (!options.force && this.isConnectingWifi) {
      return;
    }

    this.selectedNetwork = null;
    this.wifiDialogView.close(options);
  }

  syncConnectedWifiSsid(wifiSsid) {
    const previousWifiSsid = this.connectedWifiSsid;
    this.connectedWifiSsid = wifiSsid || "";
    this.controlsView?.setKnownWifiNetwork(Boolean(this.connectedWifiSsid));

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

  resetForDisconnect() {
    this.reset();
  }

  resetForBusyDevice() {
    this.reset();
  }

  reset() {
    this.setWifiScanState(false);
    this.stopWifiConnectionTimeout();
    this.stopWifiForgetTimeout();
    this.connectedWifiSsid = "";
    this.pendingWifiSsid = "";
    this.currentWifiStatus = "";
    this.wifiConnectionInterrupted = false;
    this.isConnectingWifi = false;
    this.isForgettingWifi = false;
    this.closeDialog({ force: true });
    this.controlsView?.setKnownWifiNetwork(false);
    this.networkListView.clear();
    this.scannedNetworks = [];
    this.pendingScanNetworks = [];
  }

  hasKnownWifiNetwork() {
    return Boolean(this.connectedWifiSsid);
  }

  renderNetworkList(networks) {
    this.scannedNetworks = networks;
    this.networkListView.render(networks, {
      connectedWifiSsid: this.connectedWifiSsid,
    });
  }

  setWifiScanState(isScanningWifi) {
    this.isScanningWifi = isScanningWifi;
    this.setupSession.setHeartbeatSuspended(isScanningWifi);

    if (isScanningWifi) {
      this.startWifiScanTimeout();
    } else {
      this.stopWifiScanTimeout();
    }

    this.controlsView.showScanState(isScanningWifi);
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

  isConnectedSsid(ssid) {
    return (
      this.connectedWifiSsid.length > 0 &&
      ssid === this.connectedWifiSsid
    );
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
    this.closeDialog({ force: true });
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

  finishForgetWifiNetwork() {
    this.isForgettingWifi = false;
    this.stopWifiForgetTimeout();
    this.controlsView.showForgetState(false);
    this.controlsView.showMessage(
      "The saved Wi-Fi network was removed from this Posture Pad.",
    );
    this.onWifiForgotten?.();
  }

  startWifiForgetTimeout() {
    this.stopWifiForgetTimeout();

    this.wifiForgetTimeout = window.setTimeout(() => {
      if (!this.isForgettingWifi) {
        return;
      }

      this.isForgettingWifi = false;
      this.controlsView.showForgetState(false);
      this.controlsView.showMessage(
        "Could not confirm that the Wi-Fi network was forgotten.",
      );
    }, WIFI_FORGET_TIMEOUT_MS);
  }

  stopWifiForgetTimeout() {
    if (!this.wifiForgetTimeout) {
      return;
    }

    window.clearTimeout(this.wifiForgetTimeout);
    this.wifiForgetTimeout = null;
  }
}
