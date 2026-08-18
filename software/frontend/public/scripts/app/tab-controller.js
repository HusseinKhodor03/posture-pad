const TAB_HASHES = {
  dashboard: "#dashboard",
  configuration: "#configuration",
};

function getActiveTabHash() {
  const validHashes = Object.values(TAB_HASHES);

  if (validHashes.includes(window.location.hash)) {
    return window.location.hash;
  }

  return TAB_HASHES.dashboard;
}

function showActiveTab(tabs) {
  const activeTabHash = getActiveTabHash();

  tabs.forEach((tab) => {
    const isSelected = tab.hash === activeTabHash;
    tab.button.classList.toggle("active", isSelected);
    tab.panel.hidden = !isSelected;
  });

  return activeTabHash;
}

export function initTabs({
  onDashboardTabActive,
  onInitialNonDashboardTab,
} = {}) {
  const tabs = [
    {
      button: document.getElementById("dashboardTab"),
      panel: document.getElementById("dashboardPanel"),
      hash: TAB_HASHES.dashboard,
    },
    {
      button: document.getElementById("configTab"),
      panel: document.getElementById("configPanel"),
      hash: TAB_HASHES.configuration,
    },
  ];

  tabs.forEach((selectedTab) => {
    selectedTab.button.addEventListener("click", () => {
      window.location.hash = selectedTab.hash;
    });
  });

  window.addEventListener("hashchange", () => {
    const activeTabHash = showActiveTab(tabs);

    if (activeTabHash === TAB_HASHES.dashboard) {
      onDashboardTabActive?.();
    }
  });

  const activeTabHash = showActiveTab(tabs);

  if (activeTabHash === TAB_HASHES.dashboard) {
    onDashboardTabActive?.();
  } else {
    onInitialNonDashboardTab?.();
  }
}
