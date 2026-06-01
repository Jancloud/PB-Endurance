const MARATHON_DISTANCE_KM = 42.195;
const SAFE_GLYCOGEN_G = 50;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundTo(value, digits = 1) {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function parseHourMinute(text) {
  if (!text || typeof text !== "string") return 0;
  const parts = text.split(":").map((item) => Number(item));
  if (parts.length !== 2 || parts.some((item) => Number.isNaN(item))) return 0;
  return parts[0] * 3600 + parts[1] * 60;
}

function formatHourMinute(totalSeconds) {
  const sec = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

function interpolateByVdot(vdot) {
  const anchors = [
    { vdot: 45, half: "1:37", full: "3:24" },
    { vdot: 50, half: "1:30", full: "3:08" },
    { vdot: 53, half: "1:25", full: "3:03" },
    { vdot: 55, half: "1:24", full: "3:00" },
    { vdot: 60, half: "1:17", full: "2:43" },
  ];
  const sorted = anchors.slice().sort((a, b) => a.vdot - b.vdot);
  if (vdot <= sorted[0].vdot) return { half: sorted[0].half, full: sorted[0].full };
  if (vdot >= sorted[sorted.length - 1].vdot) {
    const last = sorted[sorted.length - 1];
    return { half: last.half, full: last.full };
  }

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const left = sorted[i];
    const right = sorted[i + 1];
    if (vdot >= left.vdot && vdot <= right.vdot) {
      const ratio = (vdot - left.vdot) / (right.vdot - left.vdot);
      const halfSec = parseHourMinute(left.half) + (parseHourMinute(right.half) - parseHourMinute(left.half)) * ratio;
      const fullSec = parseHourMinute(left.full) + (parseHourMinute(right.full) - parseHourMinute(left.full)) * ratio;
      return {
        half: formatHourMinute(halfSec),
        full: formatHourMinute(fullSec),
      };
    }
  }
  return { half: sorted[0].half, full: sorted[0].full };
}

function getLoadingText(percent) {
  if (percent >= 90) return "状态：完美装载（3天高碳水方案）";
  if (percent >= 70) return "状态：良好（赛前1天认真补碳）";
  if (percent >= 50) return "状态：一般（正常饮食，无额外补碳）";
  return "状态：不足（可能存在空腹感）";
}

function getAbsorbTierText(maxAbsorbPerHour) {
  if (maxAbsorbPerHour >= 90) return "精英档：需要长期肠胃训练（约90g/h）";
  if (maxAbsorbPerHour >= 75) return "进阶档：有规律补给训练（约75g/h）";
  return "大众档：稳妥安全线（约60g/h）";
}

function buildFuelerParamHints(form, summary) {
  const vdotValue = roundTo(form.vdot, 1).toFixed(1);
  const anchor = interpolateByVdot(Number(vdotValue));
  const totalRaceCarb = Math.round(form.gelCount * form.gelCarbG);
  const tempHint =
    form.ambientTempC > 15
      ? `当前高温修正：超过15°C后，每升高1°C，糖耗系数 +${form.ambientTempC - 15}%`
      : "12°C 附近通常更利于长距离发挥";

  return {
    vdotValue,
    weight: "体重直接影响基础能耗与糖原储备上限",
    vdot: `成绩锚点：半马 ${anchor.half} / 全马 ${anchor.full}`,
    pace: `全马预计完赛：${summary.finishTime}`,
    loading: getLoadingText(form.loadingPercent),
    gelCount: `${form.gelCount} 根补给，赛中总碳水约 ${totalRaceCarb}g`,
    ambientTemp: tempHint,
    gelCarb: "常见能量胶约 20-30g/支，可按品牌调整",
    maxAbsorb: getAbsorbTierText(form.maxAbsorbPerHour),
  };
}

function mixColor(from, to, t) {
  const ratio = clamp(t, 0, 1);
  const rgb = from.map((ch, i) => Math.round(ch + (to[i] - ch) * ratio));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

function getHeatColor(remainingG) {
  const safe = [43, 240, 111];
  const warn = [255, 210, 94];
  const danger = [255, 90, 90];
  if (remainingG <= 0) return `rgb(${danger[0]}, ${danger[1]}, ${danger[2]})`;
  if (remainingG >= SAFE_GLYCOGEN_G) return `rgb(${safe[0]}, ${safe[1]}, ${safe[2]})`;
  const ratio = (SAFE_GLYCOGEN_G - remainingG) / SAFE_GLYCOGEN_G;
  return mixColor(safe, warn, ratio);
}

function kmToPercent(km) {
  const ratio = (km - 1) / (MARATHON_DISTANCE_KM - 1);
  return `${(ratio * 100).toFixed(2)}%`;
}

function buildFuelerHeatmapModel(series, effectiveGelPoints, focusedEffectiveKm) {
  const points = Array.isArray(series) ? series : [];
  const gelSet = new Set(effectiveGelPoints);
  const coreKms = [30, 35, 40, 42];
  const tickKms = [5, 10, 15, 20, 25, 30, 35, 40, 42];
  const bonkPoint = points.find((item) => item.remainingG < 0);

  return {
    segments: points.map((item) => ({
      km: item.km,
      color: getHeatColor(item.remainingG),
      isFocus: Number.isFinite(focusedEffectiveKm) ? Math.abs(item.km - focusedEffectiveKm) <= 1 : false,
    })),
    ticks: tickKms.map((km) => ({
      km,
      left: kmToPercent(km),
    })),
    markers: effectiveGelPoints.map((km) => ({
      km,
      left: kmToPercent(km),
      isFocus: Number.isFinite(focusedEffectiveKm) ? Math.abs(km - focusedEffectiveKm) <= 1 : false,
      isGel: gelSet.has(km),
    })),
    core: coreKms.map((km) => {
      const hit = points.find((item) => item.km === km) || points[points.length - 1] || { remainingG: 0 };
      return {
        km,
        remainingText: `${hit.remainingG.toFixed(1)}g`,
        isBonk: hit.remainingG < 0 || !!hit.isBonk,
      };
    }),
    bonkLeft: bonkPoint ? kmToPercent(bonkPoint.km) : "",
    bonkKm: bonkPoint ? bonkPoint.km : null,
  };
}

function getFuelerCurveMeta(series) {
  const ys = (series || []).map((item) => item.remainingG);
  const minRaw = Math.min(...ys);
  const maxRaw = Math.max(...ys);
  const minY = Math.floor(minRaw) - 20;
  const maxY = Math.max(120, Math.ceil(maxRaw / 20) * 20 + 20);
  const rangeY = Math.max(20, maxY - minY);
  return { minY, maxY, rangeY };
}

function getFuelerZoneColor(glycogen) {
  if (glycogen < 0) return "#ff5b5b";
  if (glycogen <= SAFE_GLYCOGEN_G) return "#ffd76a";
  return "#00f2ff";
}

module.exports = {
  buildFuelerParamHints,
  buildFuelerHeatmapModel,
  getFuelerCurveMeta,
  getFuelerZoneColor,
};
