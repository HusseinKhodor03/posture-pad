export class HeatmapRenderer {
  constructor({ containerId, svgFile, sensorConfig, pressureGradient, scale = 15 }) {
    this.container = document.getElementById(containerId);
    this.svgFile = svgFile;
    this.sensorConfig = sensorConfig;
    this.pressureGradient = pressureGradient;
    this.scale = scale;
    this.sensorData = {};
    this.blobShapes = {};
    this.canvas = null;
    this.ctx = null;
    this.path = null;
    this.bbox = null;
    this.padding = 0;
    this.strokeWidth = 0.4;

    Object.keys(this.sensorConfig).forEach((key) => {
      this.sensorData[key] = 0;
      this.blobShapes[key] = this.generateBlobShape(
        this.sensorConfig[key].type,
      );
    });
  }

  async init() {
    const response = await fetch(this.svgFile);
    const svgText = await response.text();

    this.container.innerHTML = svgText;

    const svg = this.container.querySelector("svg");
    this.path = svg.querySelector("path");
    if (!this.path) return;

    this.path.setAttribute("fill", "none");
    this.path.setAttribute("stroke", "#000");
    this.path.setAttribute("stroke-width", this.strokeWidth);

    this.bbox = this.path.getBBox();
    this.padding = this.strokeWidth;

    const canvasWidth = (this.bbox.width + this.padding * 2) * this.scale;
    const canvasHeight = (this.bbox.height + this.padding * 2) * this.scale;

    svg.setAttribute(
      "viewBox",
      `${this.bbox.x - this.padding} ${this.bbox.y - this.padding} ${
        this.bbox.width + this.padding * 2
      } ${this.bbox.height + this.padding * 2}`,
    );
    svg.setAttribute("width", canvasWidth);
    svg.setAttribute("height", canvasHeight);

    this.canvas = document.createElement("canvas");
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    this.canvas.style.position = "absolute";
    this.canvas.style.left = "0";
    this.canvas.style.top = "0";
    this.container.style.position = "relative";
    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext("2d");
    this.draw();
  }

  updateSensorData(sensors) {
    Object.keys(sensors).forEach((key) => {
      this.sensorData[key] = sensors[key].normalized;
    });
  }

  draw() {
    if (!this.ctx || !this.canvas || !this.path || !this.bbox) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.scale(this.scale, this.scale);
    this.ctx.translate(
      -this.bbox.x + this.padding,
      -this.bbox.y + this.padding,
    );
    const clipPath = new Path2D(this.path.getAttribute("d"));
    this.ctx.clip(clipPath);
    this.ctx.globalCompositeOperation = "screen";

    Object.keys(this.sensorConfig).forEach((key) => {
      const sensor = this.sensorConfig[key];
      const pressure = this.sensorData[key] || 0;
      const cx = this.bbox.x + this.bbox.width * sensor.x;
      const cy = this.bbox.y + this.bbox.height * sensor.y;
      this.drawOrganicBlob(cx, cy, this.blobShapes[key], pressure);
    });

    this.ctx.restore();

    this.ctx.save();
    this.ctx.scale(this.scale, this.scale);
    this.ctx.translate(
      -this.bbox.x + this.padding,
      -this.bbox.y + this.padding,
    );
    this.ctx.strokeStyle = this.path.getAttribute("stroke");
    this.ctx.lineWidth = this.strokeWidth;
    this.ctx.stroke(new Path2D(this.path.getAttribute("d")));
    this.ctx.restore();
  }

  generateBlobShape(sensorType) {
    const baseSize = sensorType === "square" ? 0.38 : 0.16;
    return { sensorType, baseSize };
  }

  getColorForPressure(pressure) {
    for (let i = 0; i < this.pressureGradient.length - 1; i++) {
      const current = this.pressureGradient[i];
      const next = this.pressureGradient[i + 1];
      if (pressure >= current.value && pressure <= next.value) {
        const t = (pressure - current.value) / (next.value - current.value);
        return current.color.map((c, idx) =>
          Math.round(c + (next.color[idx] - c) * t),
        );
      }
    }
    return [255, 243, 59];
  }

  drawOrganicBlob(x, y, shape, pressure) {
    if (pressure <= 0.01) return;

    const [r, g, b] = this.getColorForPressure(pressure);
    const size = shape.baseSize * 1.3 * this.bbox.width;

    this.ctx.save();
    this.ctx.translate(x, y);

    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1.0)`);
    gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.95)`);
    gradient.addColorStop(0.8, `rgba(${r}, ${g}, ${b}, 0.85)`);
    gradient.addColorStop(0.95, `rgba(${r}, ${g}, ${b}, 0.6)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    this.ctx.fillStyle = gradient;

    if (shape.sensorType === "square") {
      this.ctx.fillRect(-size / 2, -size / 2, size, size);
    } else {
      this.ctx.beginPath();
      this.ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }
}
