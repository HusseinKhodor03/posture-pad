import { HeatmapRenderer } from "./heatmap-renderer.js";

const LEFT_FOOT_SVG = "assets/left_foot.svg";
const RIGHT_FOOT_SVG = "assets/right_foot.svg";

const LEFT_SENSOR_CONFIG = {
  sensor0: { x: 0.74, y: 0.1, type: "circular" }, // big toe
  sensor1: { x: 0.55, y: 0.14, type: "circular" },
  sensor2: { x: 0.37, y: 0.18, type: "circular" },
  sensor3: { x: 0.19, y: 0.22, type: "circular" }, // pinky toe
  sensor4: { x: 0.2, y: 0.38, type: "square" }, // midfoot left
  sensor5: { x: 0.7, y: 0.38, type: "square" }, // midfoot right
  sensor6: { x: 0.23, y: 0.613, type: "square" }, // lower left
  sensor7: { x: 0.73, y: 0.613, type: "square" }, // lower right
  sensor8: { x: 0.49, y: 0.85, type: "square" }, // heel
};

const RIGHT_SENSOR_CONFIG = {
  sensor0: { x: 0.26, y: 0.1, type: "circular" }, // big toe
  sensor1: { x: 0.45, y: 0.14, type: "circular" },
  sensor2: { x: 0.63, y: 0.18, type: "circular" },
  sensor3: { x: 0.81, y: 0.22, type: "circular" }, // pinky toe
  sensor4: { x: 0.3, y: 0.38, type: "square" }, // midfoot left
  sensor5: { x: 0.8, y: 0.38, type: "square" }, // midfoot right
  sensor6: { x: 0.27, y: 0.613, type: "square" }, // lower left
  sensor7: { x: 0.77, y: 0.613, type: "square" }, // lower right
  sensor8: { x: 0.51, y: 0.85, type: "square" }, // heel
};

const PRESSURE_GRADIENT = [
  { value: 0.0, color: [255, 243, 59] },
  { value: 0.25, color: [253, 199, 12] },
  { value: 0.5, color: [243, 144, 63] },
  { value: 0.75, color: [237, 104, 60] },
  { value: 1.0, color: [233, 62, 58] },
];

export class FootHeatmaps {
  constructor() {
    this.leftHeatmap = new HeatmapRenderer({
      containerId: "leftFootContainer",
      svgFile: LEFT_FOOT_SVG,
      sensorConfig: LEFT_SENSOR_CONFIG,
      pressureGradient: PRESSURE_GRADIENT,
    });
    this.rightHeatmap = new HeatmapRenderer({
      containerId: "rightFootContainer",
      svgFile: RIGHT_FOOT_SVG,
      sensorConfig: RIGHT_SENSOR_CONFIG,
      pressureGradient: PRESSURE_GRADIENT,
    });
    this.initPromise = null;
  }

  init() {
    if (!this.initPromise) {
      this.initPromise = Promise.all([
        this.leftHeatmap.init(),
        this.rightHeatmap.init(),
      ]);
    }

    return this.initPromise;
  }

  updateFromDashboardData(dashboardData) {
    this.leftHeatmap.updateSensorData(dashboardData.left_foot.sensors);
    this.rightHeatmap.updateSensorData(dashboardData.right_foot.sensors);
  }

  reset() {
    this.leftHeatmap.resetSensorData();
    this.rightHeatmap.resetSensorData();
  }

  draw() {
    this.leftHeatmap.draw();
    this.rightHeatmap.draw();
  }

  startDrawLoop() {
    const drawHeatmaps = () => {
      this.draw();
      requestAnimationFrame(drawHeatmaps);
    };

    drawHeatmaps();
  }
}
