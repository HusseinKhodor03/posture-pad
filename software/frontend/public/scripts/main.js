import { initTabs } from "./app/tab-controller.js";
import {
  finishBooting,
  finishHeatmapLoading,
} from "./app/app-loading-view.js";
import { ConfigurationController } from "./configuration/configuration-controller.js";
import { DashboardController } from "./dashboard/dashboard-controller.js";

function main() {
  const configurationController = new ConfigurationController({
    onDeviceConnected: ({
      deviceId,
      deviceLabel,
      authToken,
      isSameDevice,
    }) => {
      dashboardController.setAuthToken(authToken);
      dashboardController.setDevice({
        deviceId,
        deviceLabel,
        preserveStatus: isSameDevice,
      });
    },
    onDeviceDisconnected: ({ deviceLabel }) => {
      dashboardController.clearAuthToken();
      dashboardController.clearDevice({
        deviceLabel,
      });
    },
    onWifiForgotten: ({ deviceLabel }) => {
      dashboardController.reset({
        deviceLabel,
      });
    },
    onWifiScanStateChanged: (scanState) => {
      dashboardController.setPaused(scanState);
    },
  });

  const dashboardController = new DashboardController({
    deviceLabel: configurationController.getDeviceLabel(),
    onObservedWifiSsidChanged: (wifiSsid) => {
      configurationController.syncObservedWifiSsid(wifiSsid);
    },
  });

  initTabs({
    onDashboardTabActive: () => {
      dashboardController.initHeatmaps().finally(() => {
        finishHeatmapLoading();
        finishBooting();
      });
    },
    onInitialNonDashboardTab: () => {
      finishBooting();
    },
  });

  dashboardController.connect();
  configurationController.init();
  configurationController.syncObservedWifiSsid(
    dashboardController.getObservedWifiSsid(),
  );

  dashboardController.startHeatmapDrawLoop();
}

main();
