import { TAB_HASHES } from "./config/constants.js";
import {
  clearSelectedDevice,
  formatDeviceLabel,
  loadSelectedDeviceId,
  selectDevice,
} from "./device/device-selection.js";
import { initTabs } from "./ui/tab-controller.js";
import { updateConfigView } from "./ui/config-view.js";
import {
  finishBooting,
  finishHeatmapLoading,
} from "./ui/app-shell-view.js";
import { DeviceSetupController } from "./device/device-setup-controller.js";
import { DashboardController } from "./dashboard/dashboard-controller.js";

function main() {
  if (loadSelectedDeviceId()) {
    clearSelectedDevice();
  }

  let selectedDeviceId = null;
  let selectedDeviceLabel = formatDeviceLabel(selectedDeviceId);
  let selectedDeviceWifiSsid = "";
  let isSetupConnected = false;
  let isScanningWifi = false;

  let deviceSetupController = null;

  const renderConfig = () => {
    updateConfigView({
      deviceLabel: selectedDeviceLabel,
      deviceId: selectedDeviceId,
      hasSelectedDevice: Boolean(selectedDeviceId),
      isSetupConnected,
      wifiSsid: selectedDeviceWifiSsid,
    });
  };

  const syncObservedWifiSsid = () => {
    deviceSetupController?.syncObservedWifiSsid(selectedDeviceWifiSsid);
  };

  const dashboardController = new DashboardController({
    deviceLabel: selectedDeviceLabel,
    onObservedWifiSsidChanged: (wifiSsid) => {
      selectedDeviceWifiSsid = wifiSsid;
      renderConfig();
      syncObservedWifiSsid();
    },
  });

  const initialTabHash = initTabs({
    onTabChange: (activeTabHash) => {
      if (activeTabHash !== TAB_HASHES.dashboard) {
        return;
      }

      dashboardController.initHeatmaps().finally(() => {
        finishHeatmapLoading();
        finishBooting();
      });
    },
  });

  if (initialTabHash !== TAB_HASHES.dashboard) {
    finishBooting();
  }

  renderConfig();
  dashboardController.connect();

  deviceSetupController = new DeviceSetupController({
    onDeviceConnected: (deviceId, authToken) => {
      const isSameDevice = selectedDeviceId === deviceId;
      selectedDeviceId = deviceId;
      selectedDeviceLabel = formatDeviceLabel(selectedDeviceId);
      selectedDeviceWifiSsid = isSameDevice ? selectedDeviceWifiSsid : "";
      isSetupConnected = true;
      selectDevice(selectedDeviceId);
      dashboardController.setAuthToken(authToken);
      dashboardController.setDevice({
        deviceId: selectedDeviceId,
        deviceLabel: selectedDeviceLabel,
        preserveStatus: isSameDevice,
      });
      renderConfig();
      syncObservedWifiSsid();
    },
    onDeviceDisconnected: () => {
      selectedDeviceId = null;
      selectedDeviceLabel = formatDeviceLabel(selectedDeviceId);
      selectedDeviceWifiSsid = "";
      isSetupConnected = false;
      clearSelectedDevice();
      dashboardController.clearAuthToken();
      dashboardController.clearDevice({
        deviceLabel: selectedDeviceLabel,
      });
      renderConfig();
      syncObservedWifiSsid();
    },
    onWifiConnected: (wifiSsid) => {
      selectedDeviceWifiSsid = wifiSsid;
      renderConfig();
    },
    onWifiForgotten: () => {
      selectedDeviceWifiSsid = "";
      dashboardController.reset({
        deviceLabel: selectedDeviceLabel,
      });
      renderConfig();
      syncObservedWifiSsid();
    },
    onWifiScanStateChanged: (scanState) => {
      isScanningWifi = scanState;
      dashboardController.setPaused(isScanningWifi);
      renderConfig();
    },
  });
  deviceSetupController.init();
  syncObservedWifiSsid();

  dashboardController.startHeatmapDrawLoop();
}

main();
