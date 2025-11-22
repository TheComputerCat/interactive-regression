class CoordinateConverter {
  constructor(canvas) {
    this.canvas = canvas;
  }

  toData(px, py) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: px / rect.width,
      y: 1 - py / rect.height
    };
  }

  toCanvas(x, y) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      px: x * rect.width,
      py: (1 - y) * rect.height
    };
  }
}

class StatsTools {
  static mean(arr) {
    return arr.reduce((a, c) => a + c, 0) / arr.length;
  }

  static linearRegression(pts) {
    const n = pts.length;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;

    for (const p of pts) {
      sx += p.x;
      sy += p.y;
      sxx += p.x * p.x;
      sxy += p.x * p.y;
    }

    const m = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    const b = (sy - m * sx) / n;
    return { m, b };
  }

  static correlation(pts) {
    if (pts.length < 2) return 0;

    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const mx = StatsTools.mean(xs);
    const my = StatsTools.mean(ys);

    let num = 0, dx = 0, dy = 0;

    for (let i = 0; i < pts.length; i++) {
      const X = xs[i] - mx;
      const Y = ys[i] - my;
      num += X * Y;
      dx += X * X;
      dy += Y * Y;
    }

    return dx * dy === 0 ? 0 : num / Math.sqrt(dx * dy);
  }
}

class CanvasDrawer {
  constructor(canvas, ctx, converter, pointsRef, customLineRef, clicksRef) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.converter = converter;
    this.points = pointsRef;
    this.customLine = customLineRef;
    this.clicks = clicksRef;

    this.gridLW = 2;
    this.pointLW = 2;
    this.regressionLW = 2;
    this.meanLW = 2;
    this.residualLW = 2;
    this.customLW = 3;

    this.pointRadius = 10;
    this.mouseRadio = 20;
  }

  drawAll() {
    this.drawGrid();
    this.drawMeanLines();
    this.drawLeastSquares();
    this.drawCustomUserLine();
    this.drawSquaredErrors();
    this.drawResiduals();
    this.drawPoints();
    this.updateInfoBox();
  }

  drawGrid() {
    const rect = this.canvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    const cellSize = 50;

    this.ctx.clearRect(0, 0, W, H);
    this.ctx.save();

    this.ctx.strokeStyle = "#e7edf2";
    this.ctx.lineWidth = this.gridLW;

    for (let x = 0; x <= W; x += cellSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, H);
      this.ctx.stroke();
    }

    for (let y = 0; y <= H; y += cellSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(W, y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }


  drawPoints() {
    this.ctx.save();
    this.ctx.strokeStyle = "#aa0066";
    this.ctx.lineWidth = this.pointLW;
    this.ctx.fillStyle = "#aa0066";

    for (const p of this.points.value) {
      const c = this.converter.toCanvas(p.x, p.y);
      this.ctx.beginPath();
      this.ctx.arc(c.px, c.py, this.pointRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawMeanLines() {
    const show = document.getElementById("showMean").checked;
    if (!show || this.points.value.length < 1) return;

    const xs = this.points.value.map(p => p.x);
    const ys = this.points.value.map(p => p.y);
    const mx = StatsTools.mean(xs);
    const my = StatsTools.mean(ys);

    const h1 = this.converter.toCanvas(0, my);
    const h2 = this.converter.toCanvas(1, my);

    this.ctx.save();
    this.ctx.strokeStyle = "#2b7bca";
    this.ctx.lineWidth = this.meanLW;

    this.ctx.beginPath();
    this.ctx.moveTo(h1.px, h1.py);
    this.ctx.lineTo(h2.px, h2.py);
    this.ctx.stroke();

    const v1 = this.converter.toCanvas(mx, 0);
    const v2 = this.converter.toCanvas(mx, 1);

    this.ctx.beginPath();
    this.ctx.moveTo(v1.px, v1.py);
    this.ctx.lineTo(v2.px, v2.py);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawLeastSquares() {
    const show = document.getElementById("showLS").checked;
    if (!show || this.points.value.length < 2) return;

    const reg = StatsTools.linearRegression(this.points.value);
    this.drawInfiniteLine(reg.m, reg.b, "#0b7a3f", this.regressionLW);
  }

  drawCustomUserLine() {
    const line = this.customLine.value;
    if (!line) return;

    this.ctx.save();
    this.ctx.strokeStyle = "#aa0066";
    this.ctx.lineWidth = this.customLW;

    this.ctx.beginPath();
    this.ctx.moveTo(line.x1, line.y1);
    this.ctx.lineTo(line.x2, line.y2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawResiduals() {
    const show = document.getElementById("showResid").checked;
    if (!show || this.points.value.length < 2) return;

    const reg = StatsTools.linearRegression(this.points.value);

    this.ctx.save();
    this.ctx.strokeStyle = "rgba(180,20,30,0.9)";
    this.ctx.lineWidth = this.residualLW;

    for (const p of this.points.value) {
      const real = this.converter.toCanvas(p.x, p.y);
      const yLine = reg.m * p.x + reg.b;
      const proj = this.converter.toCanvas(p.x, yLine);

      this.ctx.beginPath();
      this.ctx.moveTo(real.px, real.py);
      this.ctx.lineTo(proj.px, proj.py);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawSquaredErrors() {
    const show = document.getElementById("showSquares").checked;
    if (!show || this.points.value.length < 2) return;

    const reg = StatsTools.linearRegression(this.points.value);

    this.ctx.save();
    this.ctx.fillStyle = "rgba(200, 40, 40, 0.25)";

    for (const p of this.points.value) {
      const real = this.converter.toCanvas(p.x, p.y);
      const yLine = reg.m * p.x + reg.b;
      const proj = this.converter.toCanvas(p.x, yLine);

      const dx = proj.px - real.px;
      const dy = proj.py - real.py;

      const side = Math.sqrt(dx * dx + dy * dy);

      this.ctx.save();
      this.ctx.translate(real.px, real.py);
      const ang = Math.atan2(dy, dx);
      this.ctx.rotate(ang);

      this.ctx.fillRect(0, 0, side, side);

      this.ctx.restore();
    }

    this.ctx.restore();
  }


  drawInfiniteLine(m, b, color, width) {
    const a = this.converter.toCanvas(0, b);
    const c = this.converter.toCanvas(1, m + b);

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;

    this.ctx.beginPath();
    this.ctx.moveTo(a.px, a.py);
    this.ctx.lineTo(c.px, c.py);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawPreviewPoint(x, y) {
    this.ctx.save();
    this.ctx.fillStyle = "#444";
    this.ctx.beginPath();
    this.ctx.arc(x, y, 5, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  updateInfoBox() {
    const box = document.getElementById("infoBox");
    const r = StatsTools.correlation(this.points.value);

    let m = "-";
    let b = "-";

    if (this.points.value.length >= 2) {
      const reg = StatsTools.linearRegression(this.points.value);
      m = reg.m.toFixed(4);
      b = reg.b.toFixed(4);
    }

    box.innerHTML =
      `<h3>Puntos</h3>
      <h1>${this.points.value.length}</h1>

      <h3>Coeficiente de correlacion</h3>
      <h1>${this.points.value.length >= 2 ? r.toFixed(4) : "-"}</h1>

      <h3>Pendiente</h3>
      <h1>${m}</h1>

      <h3>Intercepto</h3>
      <h1>${b}</h1>`;
  }
}

class AppController {
  constructor() {
    this.canvas = document.getElementById("c");
    this.ctx = this.canvas.getContext("2d");
    this.DPR = window.devicePixelRatio || 1;
    this.draggedPointIndex = null;
    this.dragging = false;

    this.points = { value: [] };
    this.customLine = { value: null };
    this.clicks = { value: [] };

    this.converter = new CoordinateConverter(this.canvas);
    this.drawer = new CanvasDrawer(
      this.canvas,
      this.ctx,
      this.converter,
      this.points,
      this.customLine,
      this.clicks
    );

    this.setupCanvas();
    this.setupEvents();
    this.resizeCanvas();
  }

  setupCanvas() {
    window.addEventListener("resize", () => this.resizeCanvas());
    this.setCustomCursor(this.drawer.mouseRadio);
  }

  setCustomCursor(radius) {
    const cursorCanvas = document.createElement("canvas");
    const size = radius * 2;
    cursorCanvas.width = size;
    cursorCanvas.height = size;
    const ctx = cursorCanvas.getContext("2d");

    ctx.fillStyle = "rgba(255,0,0,0.5)";
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, Math.PI * 2);
    ctx.fill();

    const dataURL = cursorCanvas.toDataURL("image/png");
    this.canvas.style.cursor = `url(${dataURL}) ${radius} ${radius}, auto`;
  }


  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.DPR;
    this.canvas.height = rect.height * this.DPR;
    this.ctx.scale(this.DPR, this.DPR);
    this.drawer.drawAll();
  }

  setupEvents() {
    this.canvas.addEventListener("click", ev => this.handleClick(ev));
    this.canvas.addEventListener("mousedown", ev => this.startDrag(ev));
    this.canvas.addEventListener("mousemove", ev => this.dragPoint(ev));
    this.canvas.addEventListener("mouseup", () => this.endDrag());
    this.canvas.addEventListener("mouseleave", () => this.endDrag());
    this.canvas.addEventListener("mousedown", ev => {
      if (ev.button === 2) {
        this.deletePoint(ev);
      }
    });
    this.canvas.addEventListener("contextmenu", ev => ev.preventDefault());



    document.getElementById("clearBtn").addEventListener("click", () => {
      this.points.value = [];
      this.customLine.value = null;
      this.clicks.value = [];
      this.drawer.drawAll();
    });

    document.getElementById("showLS").addEventListener("change", () => this.drawer.drawAll());
    document.getElementById("showMean").addEventListener("change", () => this.drawer.drawAll());
    document.getElementById("showResid").addEventListener("change", () => this.drawer.drawAll());
    document.getElementById("showSquares").addEventListener("change", () => this.drawer.drawAll());

    document.querySelectorAll("input[name=mode]").forEach(r => {
      r.addEventListener("change", () => {
        this.clicks.value = [];
        this.customLine.value = null;
        this.drawer.drawAll();
      });
    });
  }

  handleClick(ev) {
    if (this.dragging) {
      this.dragging = false;
      return;
    };

    const rect = this.canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const mode = document.querySelector("input[name=mode]:checked").value;

    if (mode === "add") {
      this.points.value.push(this.converter.toData(x, y));
      this.drawer.drawAll();
      return;
    }

    this.clicks.value.push({ px: x, py: y });

    if (this.clicks.value.length === 2) {
      this.customLine.value = {
        x1: this.clicks.value[0].px,
        y1: this.clicks.value[0].py,
        x2: this.clicks.value[1].px,
        y2: this.clicks.value[1].py
      };
      this.clicks.value = [];
      this.drawer.drawAll();
    } else {
      this.drawer.drawAll();
      this.drawer.drawPreviewPoint(x, y);
    }
  }

  startDrag(ev) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    const radius = this.drawer.mouseRadio;
    const px = x;
    const py = y;

    for (let i = 0; i < this.points.value.length; i++) {
      const c = this.converter.toCanvas(this.points.value[i].x, this.points.value[i].y);
      const dx = c.px - px;
      const dy = c.py - py;
      if (dx * dx + dy * dy <= radius * radius) {
        this.draggedPointIndex = i;
        this.dragging = true;
        break;
      }
    }
  }

  dragPoint(ev) {
    if (this.draggedPointIndex === null) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    this.points.value[this.draggedPointIndex] = this.converter.toData(x, y);
    this.drawer.drawAll();
  }

  endDrag() {
    this.draggedPointIndex = null;
  }

  deletePoint(ev) {
  this.dragging = false;
  const rect = this.canvas.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  const y = ev.clientY - rect.top;
  const radius = this.drawer.mouseRadio;

  for (let i = 0; i < this.points.value.length; i++) {
    const c = this.converter.toCanvas(this.points.value[i].x, this.points.value[i].y);
    const dx = c.px - x;
    const dy = c.py - y;
    if (dx * dx + dy * dy <= radius * radius) {
      this.points.value.splice(i, 1);
      this.drawer.drawAll();
      break;
    }
  }
}


}

(() => new AppController())();

