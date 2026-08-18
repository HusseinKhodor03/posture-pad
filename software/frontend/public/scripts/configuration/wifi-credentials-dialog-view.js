export class WifiCredentialsDialogView {
  constructor({ onSubmit, onCancel } = {}) {
    this.onSubmit = onSubmit;
    this.onCancel = onCancel;
    this.selectedNetwork = null;
    this.isConnecting = false;

    this.wifiDialog = document.getElementById("wifiDialog");
    this.wifiDialogTitle = document.getElementById("wifiDialogTitle");
    this.wifiDialogMessage = document.getElementById("wifiDialogMessage");
    this.wifiSsidLabel = document.getElementById("wifiSsidLabel");
    this.wifiSsid = document.getElementById("wifiSsid");
    this.wifiPasswordLabel = document.getElementById("wifiPasswordLabel");
    this.wifiPassword = document.getElementById("wifiPassword");
    this.wifiSecurityLabel = document.getElementById("wifiSecurityLabel");
    this.wifiSecurity = document.getElementById("wifiSecurity");
    this.connectWifiButton = document.getElementById("connectWifiButton");
    this.cancelWifiButton = document.getElementById("cancelWifiButton");

    this.connectWifiButton.addEventListener("click", () => {
      this.onSubmit?.(this.getCredentials());
    });

    this.cancelWifiButton.addEventListener("click", () => {
      this.onCancel?.();
    });

    this.wifiSsid.addEventListener("input", () => {
      this.updateSubmitState();
    });

    this.wifiPassword.addEventListener("input", () => {
      this.updateSubmitState();
    });

    this.wifiSecurity.addEventListener("change", () => {
      this.updateManualNetworkSecurity();
      this.updateSubmitState();
    });
  }

  openForNetwork(network) {
    this.selectedNetwork = network;
    this.isConnecting = false;
    this.wifiDialogTitle.textContent = `Connect to ${network.ssid}`;
    this.showMessage(
      network.secure ? "" : "This is an open network. No password is required.",
    );
    this.wifiSsidLabel.hidden = true;
    this.wifiSecurityLabel.hidden = true;
    this.wifiPasswordLabel.hidden = !network.secure;
    this.wifiSsid.value = network.ssid;
    this.wifiPassword.value = "";
    this.wifiSecurity.value = network.secure ? "secure" : "none";
    this.wifiDialog.hidden = false;
    this.wifiSsid.disabled = false;
    this.wifiPassword.disabled = false;
    this.wifiSecurity.disabled = false;
    this.cancelWifiButton.disabled = false;
    this.connectWifiButton.textContent = "Connect";
    this.updateSubmitState();
    this.focusInput();
  }

  openManual() {
    this.selectedNetwork = null;
    this.isConnecting = false;
    this.wifiDialogTitle.textContent = "Other Network";
    this.clearMessage();
    this.wifiSsidLabel.hidden = false;
    this.wifiSecurityLabel.hidden = false;
    this.wifiSecurity.value = "secure";
    this.wifiSsid.value = "";
    this.wifiPassword.value = "";
    this.updateManualNetworkSecurity();
    this.wifiDialog.hidden = false;
    this.wifiSsid.disabled = false;
    this.wifiPassword.disabled = false;
    this.wifiSecurity.disabled = false;
    this.cancelWifiButton.disabled = false;
    this.connectWifiButton.textContent = "Connect";
    this.updateSubmitState();
    this.focusInput();
  }

  close({ force = false } = {}) {
    if (!force && this.isConnecting) {
      return;
    }

    this.selectedNetwork = null;
    this.isConnecting = false;
    this.wifiDialog.hidden = true;
    this.wifiSsidLabel.hidden = false;
    this.wifiSecurityLabel.hidden = true;
    this.wifiPasswordLabel.hidden = false;
    this.wifiSecurity.value = "secure";
    this.wifiSsid.value = "";
    this.wifiPassword.value = "";
    this.wifiSsid.disabled = false;
    this.wifiPassword.disabled = false;
    this.wifiSecurity.disabled = false;
    this.cancelWifiButton.disabled = false;
    this.connectWifiButton.textContent = "Connect";
    this.clearMessage();
    this.updateSubmitState();
  }

  getCredentials() {
    return {
      ssid: this.selectedNetwork?.ssid ?? this.wifiSsid.value.trim(),
      password: this.isWifiPasswordRequired() ? this.wifiPassword.value : "",
      isManual: !this.selectedNetwork,
    };
  }

  showMessage(message, { isError = false } = {}) {
    this.wifiDialogMessage.classList.toggle("error", isError);
    this.wifiDialogMessage.textContent = message;
  }

  clearMessage() {
    this.showMessage("");
  }

  showConnecting(ssid) {
    this.isConnecting = true;
    this.wifiDialogMessage.classList.remove("error");
    this.wifiDialogMessage.textContent = `Connecting to "${ssid}"...`;
    this.wifiSsid.disabled = true;
    this.wifiPassword.disabled = true;
    this.wifiSecurity.disabled = true;
    this.cancelWifiButton.disabled = true;
    this.connectWifiButton.disabled = true;
    this.connectWifiButton.textContent = "Connecting...";
  }

  showConnectionError({ ssid, message, isManual }) {
    this.isConnecting = false;
    this.wifiDialog.hidden = false;
    this.wifiDialogTitle.textContent = isManual
      ? "Other Network"
      : `Connect to ${ssid}`;
    this.wifiDialogMessage.classList.add("error");
    this.wifiDialogMessage.textContent = message;
    this.cancelWifiButton.disabled = false;
    this.connectWifiButton.textContent = "Connect";
    this.wifiSsid.disabled = false;
    this.wifiPassword.disabled = false;
    this.wifiSecurity.disabled = false;
    this.updateSubmitState();
    this.focusErrorInput();
  }

  updateSubmitState() {
    if (this.wifiDialog.hidden || this.isConnecting) {
      this.connectWifiButton.disabled = true;
      return;
    }

    const hasNetworkName = this.wifiSsid.value.trim().length > 0;
    const hasPassword = this.wifiPassword.value.length > 0;

    this.connectWifiButton.disabled = this.selectedNetwork
      ? this.selectedNetwork.secure && !hasPassword
      : !hasNetworkName || (this.isWifiPasswordRequired() && !hasPassword);
  }

  focusInput() {
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

  focusErrorInput() {
    if (!this.wifiPasswordLabel.hidden) {
      this.wifiPassword.focus();
      this.wifiPassword.select();
      return;
    }

    this.connectWifiButton.focus();
  }

  isOpen() {
    return !this.wifiDialog.hidden;
  }

  updateManualNetworkSecurity() {
    if (this.selectedNetwork) {
      return;
    }

    const passwordRequired = this.isWifiPasswordRequired();
    this.wifiPasswordLabel.hidden = !passwordRequired;

    if (!passwordRequired) {
      this.wifiPassword.value = "";
    }
  }

  isWifiPasswordRequired() {
    return this.selectedNetwork
      ? this.selectedNetwork.secure
      : this.wifiSecurity.value !== "none";
  }
}
