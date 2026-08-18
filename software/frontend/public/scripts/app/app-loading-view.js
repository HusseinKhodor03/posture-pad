export function finishBooting() {
  document.body.classList.remove("appBooting");
}

export function finishHeatmapLoading() {
  document.getElementById("mainContainer").classList.remove("loadingHeatmaps");
}
