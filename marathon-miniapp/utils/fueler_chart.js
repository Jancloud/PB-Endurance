const ABSORB_DELAY_KM = 2;
const FINISH_DISTANCE_KM = 42.195;
const REAR_START_KM = 25;

const { getFuelerCurveMeta, getFuelerZoneColor } = require("./fueler_view");

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function drawMainFuelerCurve(page, options) {
  const series = options.series || [];
  if (!series.length) return;

  const width = options.width || 640;
  const height = options.height || 220;
  const selectedGelKm = options.selectedGelKm;
  const gelPoints = options.gelPoints || [];
  const ctx = wx.createCanvasContext("glyChart", page);

  const pad = { left: 24, right: 8, top: 10, bottom: 24 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const { minY, maxY, rangeY } = getFuelerCurveMeta(series);

  const xAt = (km) => pad.left + ((km - 1) / (FINISH_DISTANCE_KM - 1)) * plotW;
  const yAt = (g) => pad.top + ((maxY - g) / rangeY) * plotH;
  const clampYToPlot = (y) => Math.max(pad.top + 2, Math.min(pad.top + plotH - 2, y));

  ctx.setFillStyle("#0e1722");
  ctx.fillRect(0, 0, width, height);

  ctx.setStrokeStyle("rgba(100, 130, 150, 0.25)");
  ctx.setLineWidth(1);
  [0, 0.5, 1].forEach((ratio) => {
    const y = pad.top + plotH * ratio;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
  });

  ctx.setStrokeStyle("#00f2ff");
  ctx.setLineWidth(2);
  ctx.beginPath();
  series.forEach((item, idx) => {
    const x = xAt(item.km);
    const y = clampYToPlot(yAt(item.remainingG));
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  const dangerStart = series.find((item) => item.remainingG <= 20);
  if (dangerStart) {
    const startIdx = Math.max(0, dangerStart.km - 1);
    ctx.setStrokeStyle("#ff7f7f");
    ctx.setLineDash([4, 4], 0);
    ctx.beginPath();
    for (let i = startIdx; i < series.length; i += 1) {
      const item = series[i];
      const x = xAt(item.km);
      const y = clampYToPlot(yAt(item.remainingG));
      if (i === startIdx) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([], 0);
  }

  gelPoints
    .map((km) => ({ rawKm: km, effectiveKm: clamp(km + ABSORB_DELAY_KM, 1, 42) }))
    .forEach((item) => {
      const point = series[item.effectiveKm - 1] || series[series.length - 1];
      const x = xAt(item.effectiveKm);
      const y = clampYToPlot(yAt(point.remainingG));
      const isSelected = item.rawKm === selectedGelKm;

      ctx.setStrokeStyle(isSelected ? "rgba(179,71,255,0.9)" : "rgba(179,71,255,0.35)");
      ctx.setLineWidth(isSelected ? 2 : 1);
      ctx.beginPath();
      ctx.moveTo(x, y + 8);
      ctx.lineTo(x, height - pad.bottom + 4);
      ctx.stroke();

      ctx.setFillStyle(isSelected ? "#c58dff" : "#9f5de2");
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
    });

  const finishX = xAt(FINISH_DISTANCE_KM);
  ctx.setStrokeStyle("rgba(255, 120, 120, 0.9)");
  ctx.setLineWidth(1.5);
  ctx.setLineDash([6, 5], 0);
  ctx.beginPath();
  ctx.moveTo(finishX, pad.top);
  ctx.lineTo(finishX, pad.top + plotH);
  ctx.stroke();
  ctx.setLineDash([], 0);

  const endPoint = series[series.length - 1];
  if (endPoint) {
    const endX = xAt(endPoint.km);
    const endY = clampYToPlot(yAt(endPoint.remainingG));
    ctx.setFillStyle("#53d8ff");
    ctx.beginPath();
    ctx.arc(endX, endY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    const endLabelColor = endPoint.remainingG < 0 ? "#ff6b6b" : "#ffcf6b";
    ctx.setFillStyle(endLabelColor);
    ctx.setFontSize(12);
    ctx.fillText(`${endPoint.remainingG.toFixed(1)}g`, Math.max(pad.left, finishX - 42), pad.top + 12);
    ctx.setFillStyle("#ff9d9d");
    ctx.setFontSize(10);
    ctx.fillText("42.195km", Math.max(pad.left, finishX - 24), height - 6);
  }

  ctx.setFillStyle("#8ea0b3");
  ctx.setFontSize(10);
  ctx.fillText(`${maxY}g`, 2, pad.top + 8);
  ctx.fillText(`${minY}g`, 2, height - pad.bottom);

  [1, 9, 17, 25, 33, 42].forEach((km) => {
    const tx = xAt(km);
    ctx.setStrokeStyle("rgba(120, 145, 162, 0.2)");
    ctx.setLineWidth(1);
    ctx.beginPath();
    ctx.moveTo(tx, height - pad.bottom + 2);
    ctx.lineTo(tx, height - pad.bottom + 6);
    ctx.stroke();
    ctx.setFillStyle("#7f92a4");
    ctx.setFontSize(10);
    ctx.fillText(String(km), tx - 6, height - 2);
  });

  ctx.draw();
}

function drawRearFuelerCurve(page, options) {
  const series = (options.series || []).filter((item) => item.km >= REAR_START_KM);
  if (!series.length) return;

  const width = options.width || 640;
  const height = options.height || 220;
  const ctx = wx.createCanvasContext("rearChart", page);

  const pad = { left: 24, right: 10, top: 14, bottom: 24 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const { minY, maxY, rangeY } = getFuelerCurveMeta(series);

  const xAt = (km) => pad.left + ((km - REAR_START_KM) / (FINISH_DISTANCE_KM - REAR_START_KM)) * plotW;
  const yAt = (g) => pad.top + ((maxY - g) / rangeY) * plotH;
  const clampYToPlot = (y) => Math.max(pad.top + 2, Math.min(pad.top + plotH - 2, y));

  ctx.setFillStyle("#0f1824");
  ctx.fillRect(0, 0, width, height);

  ctx.setStrokeStyle("rgba(100, 130, 150, 0.2)");
  ctx.setLineWidth(1);
  [0, 0.5, 1].forEach((ratio) => {
    const y = pad.top + plotH * ratio;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
  });

  for (let i = 1; i < series.length; i += 1) {
    const prev = series[i - 1];
    const curr = series[i];
    const x1 = xAt(prev.km);
    const y1 = clampYToPlot(yAt(prev.remainingG));
    const x2 = xAt(curr.km);
    const y2 = clampYToPlot(yAt(curr.remainingG));
    const zoneValue = Math.min(prev.remainingG, curr.remainingG);
    const color = getFuelerZoneColor(zoneValue);

    if (zoneValue < 0) ctx.setLineDash([6, 4], 0);
    else ctx.setLineDash([], 0);

    ctx.setStrokeStyle(color);
    ctx.setLineWidth(zoneValue < 0 ? 2.4 : 2.1);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.setLineDash([], 0);

  const finishX = xAt(FINISH_DISTANCE_KM);
  ctx.setStrokeStyle("rgba(255, 120, 120, 0.95)");
  ctx.setLineWidth(1.5);
  ctx.setLineDash([6, 5], 0);
  ctx.beginPath();
  ctx.moveTo(finishX, pad.top);
  ctx.lineTo(finishX, pad.top + plotH);
  ctx.stroke();
  ctx.setLineDash([], 0);

  const endPoint = series[series.length - 1];
  if (endPoint) {
    const endLabelColor = endPoint.remainingG < 0 ? "#ff5555" : "#ffcf6b";
    ctx.setFillStyle(endLabelColor);
    ctx.setFontSize(12);
    ctx.fillText(`${endPoint.remainingG.toFixed(1)}g`, Math.max(pad.left, finishX - 48), pad.top + 16);
    ctx.setFillStyle("#ff9d9d");
    ctx.setFontSize(10);
    ctx.fillText("42.195km", Math.max(pad.left, finishX - 24), height - 6);
  }

  ctx.setFillStyle("#8ea0b3");
  ctx.setFontSize(10);
  ctx.fillText(`${maxY}g`, 2, pad.top + 8);
  ctx.fillText(`${minY}g`, 2, height - pad.bottom);

  [25, 29, 33, 37, 42].forEach((km) => {
    const tx = xAt(km);
    ctx.setStrokeStyle("rgba(120, 145, 162, 0.2)");
    ctx.setLineWidth(1);
    ctx.beginPath();
    ctx.moveTo(tx, height - pad.bottom + 2);
    ctx.lineTo(tx, height - pad.bottom + 6);
    ctx.stroke();
    ctx.setFillStyle("#7f92a4");
    ctx.setFontSize(10);
    ctx.fillText(String(km), tx - 6, height - 2);
  });

  ctx.draw();
}

module.exports = {
  drawMainFuelerCurve,
  drawRearFuelerCurve,
};
