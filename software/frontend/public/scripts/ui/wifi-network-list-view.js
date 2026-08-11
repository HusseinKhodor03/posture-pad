import { createWifiSignalIcon } from "./wifi-signal-icon.js";

export class WifiNetworkListView {
  constructor({ onNetworkSelected } = {}) {
    this.onNetworkSelected = onNetworkSelected;
    this.networkListMessage = document.getElementById("networkListMessage");
    this.networkList = document.getElementById("networkList");
    this.renderedNetworks = [];
    this.networkListSignature = "";

    this.networkList.addEventListener("click", (event) => {
      const networkButton = event.target.closest(".networkListButton");

      if (!networkButton) {
        return;
      }

      const networkIndex = Number(networkButton.dataset.networkIndex);
      const network = this.renderedNetworks[networkIndex];

      if (network) {
        this.onNetworkSelected?.(network, networkIndex);
      }
    });
  }

  clear() {
    this.networkList.replaceChildren();
    this.renderedNetworks = [];
    this.networkListSignature = "";
  }

  showMessage(message) {
    this.networkListMessage.textContent = message;
  }

  render(networks, { connectedWifiSsid = "" } = {}) {
    const networkListSignature = this.buildNetworkListSignature(
      networks,
      connectedWifiSsid,
    );
    const networkListChanged =
      networkListSignature !== this.networkListSignature;

    this.renderedNetworks = networks;

    if (!networkListChanged) {
      if (networks.length) {
        this.showMessage("");
      }

      return;
    }

    this.networkListSignature = networkListSignature;
    this.networkList.replaceChildren();

    if (!networks.length) {
      this.showMessage("No Wi-Fi networks found.");
      return;
    }

    this.showMessage("");

    networks.forEach((network, index) => {
      const isConnectedNetwork = this.isConnectedSsid(
        network.ssid,
        connectedWifiSsid,
      );
      const networkItem = document.createElement("li");
      networkItem.className = "networkListItem";

      const networkButton = document.createElement("button");
      networkButton.className = `networkListButton ${
        isConnectedNetwork ? "connected" : ""
      }`;
      networkButton.type = "button";
      networkButton.dataset.networkIndex = index;
      networkButton.disabled = isConnectedNetwork;

      const networkName = document.createElement("span");
      networkName.className = "networkName";
      networkName.textContent = network.ssid;

      const networkIcons = document.createElement("span");
      networkIcons.className = "networkIcons";

      if (isConnectedNetwork) {
        const connectedLabel = document.createElement("span");
        connectedLabel.className = "networkConnectedLabel";
        connectedLabel.textContent = "Connected";
        networkIcons.appendChild(connectedLabel);
      }

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

  buildNetworkListSignature(networks, connectedWifiSsid) {
    return networks
      .map((network) => {
        const security = network.secure ? "secure" : "open";
        const signalLevel = this.getSignalLevel(network.rssi);
        const connection = this.isConnectedSsid(network.ssid, connectedWifiSsid)
          ? "connected"
          : "available";
        return `${network.ssid}|${security}|${signalLevel}|${connection}`;
      })
      .join("\n");
  }

  isConnectedSsid(ssid, connectedWifiSsid) {
    return connectedWifiSsid.length > 0 && ssid === connectedWifiSsid;
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
}
