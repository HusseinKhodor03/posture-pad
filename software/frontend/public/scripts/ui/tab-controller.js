export function initTabs() {
  const tabs = [
    {
      button: document.getElementById("dashboardTab"),
      panel: document.getElementById("dashboardPanel"),
    },
    {
      button: document.getElementById("configTab"),
      panel: document.getElementById("configPanel"),
    },
  ];

  tabs.forEach((selectedTab) => {
    selectedTab.button.addEventListener("click", () => {
      tabs.forEach((tab) => {
        const isSelected = tab === selectedTab;
        tab.button.classList.toggle("active", isSelected);
        tab.panel.hidden = !isSelected;
      });
    });
  });
}
