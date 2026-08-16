import {
  LEFT_FOOT_SVG,
  LEFT_SENSOR_CONFIG,
  PRESSURE_GRADIENT,
  RIGHT_FOOT_SVG,
  RIGHT_SENSOR_CONFIG,
} from "../config/constants.js";
import { HeatmapRenderer } from "./heatmap-renderer.js";

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
