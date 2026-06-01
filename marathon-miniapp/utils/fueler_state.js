const { simulateFueler, formatPace } = require("./pbFueler");
const { buildFuelerParamHints, buildFuelerHeatmapModel } = require("./fueler_view");

const ABSORB_DELAY_KM = 2;
const SUB3_SECONDS = 3 * 3600;
const SUB3_EDGE_WINDOW = 90;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundTo(value, digits = 1) {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function parseDurationToSeconds(hms) {
  if (!hms || typeof hms !== "string") return null;
  const parts = hms.split(":").map((item) => Number(item));
  if (parts.length !== 3 || parts.some((item) => Number.isNaN(item))) return null;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function normalizeFuelerSliderValue(key, rawValue) {
  const value = Number(rawValue);
  if (!key || Number.isNaN(value)) {
    return null;
  }
  return key === "vdot" ? roundTo(value, 1) : value;
}

function buildGelTags(gelPoints, gelDiagnostics) {
  const diagByKm = {};
  (gelDiagnostics || []).forEach((item) => {
    diagByKm[item.km] = item;
  });

  return (gelPoints || []).map((km, index) => {
    const diag = diagByKm[km];
    return {
      seq: index + 1,
      km,
      limited: !!(diag && diag.limited),
    };
  });
}

function buildAbsorbLimitHint(gelTags, maxAbsorbPerHour) {
  const firstLimited = (gelTags || []).find((item) => item.limited);
  if (!firstLimited) {
    return "";
  }
  return `检测到肠胃吸收已达峰值（${maxAbsorbPerHour}g/h）。第 ${firstLimited.seq} 根补给会出现吸收受限。`;
}

function resolveSelectedGelKm(gelPoints, previousSelectedGelKm, keepSelection) {
  if (keepSelection && (gelPoints || []).includes(previousSelectedGelKm)) {
    return previousSelectedGelKm;
  }
  return gelPoints && gelPoints.length > 0 ? gelPoints[0] : null;
}

function buildSub3Hint(form, finishSeconds) {
  const isSub3Edge = Number.isFinite(finishSeconds) && Math.abs(finishSeconds - SUB3_SECONDS) <= SUB3_EDGE_WINDOW;
  const tangentPaceText = isSub3Edge ? formatPace(clamp(form.paceSecPerKm - 2, 180, 480)) : "";
  return {
    isSub3Edge,
    tangentPaceText,
    sub3Hint: isSub3Edge ? `临界配速提醒：建议切向配速 ${tangentPaceText}` : "",
  };
}

function buildFuelerSimulationState(form, previousSelectedGelKm, options = {}) {
  const keepSelection = options.keepSelection !== false;
  const result = simulateFueler(form);
  const summary = result.summary;
  const finishSeconds = parseDurationToSeconds(summary.finishTime);
  const gelPoints = summary.gelPoints || [];
  const gelDiagnostics = summary.gelDiagnostics || [];
  const gelTags = buildGelTags(gelPoints, gelDiagnostics);
  const sub3 = buildSub3Hint(form, finishSeconds);
  const selectedGelKm = resolveSelectedGelKm(gelPoints, previousSelectedGelKm, keepSelection);

  const series = result.series || [];
  const summaryView = {
    finishTime: summary.finishTime,
    finishPace: summary.finishPace,
    bonkKm: summary.bonkKm,
    bonkKmText: summary.bonkKm ? `${summary.bonkKm}km` : "--",
    endRemainingText: `${summary.endRemainingG.toFixed(1)}g`,
    absorbedTotalG: summary.absorbedTotalG,
    gelPoints,
    gelDiagnostics,
    absorbLimitHint: buildAbsorbLimitHint(gelTags, form.maxAbsorbPerHour),
    isRisk: summary.bonkKm !== null || summary.endRemainingG < 0,
    isSub3Edge: sub3.isSub3Edge,
    sub3Hint: sub3.sub3Hint,
    tangentPaceText: sub3.tangentPaceText,
  };
  const checkpointState = buildFuelerCheckpointState(series, summaryView, selectedGelKm);

  return {
    series,
    data: Object.assign(
      {
        summary: summaryView,
        gelTags,
        selectedGelKm,
        paramHints: buildFuelerParamHints(form, summary),
      },
      checkpointState
    ),
  };
}

function buildFuelerCheckpointState(series, summary, selectedGelKm) {
  const effectiveGelPoints = ((summary && summary.gelPoints) || []).map((km) => clamp(km + ABSORB_DELAY_KM, 1, 42));
  const focusedEffectiveKm = Number.isFinite(selectedGelKm) ? clamp(selectedGelKm + ABSORB_DELAY_KM, 1, 42) : null;
  const heatmap = buildFuelerHeatmapModel(series || [], effectiveGelPoints, focusedEffectiveKm);

  return {
    heatmapSegments: heatmap.segments,
    heatmapTicks: heatmap.ticks,
    heatmapMarkers: heatmap.markers,
    heatmapCore: heatmap.core,
    heatmapBonkLeft: heatmap.bonkLeft,
    heatmapBonkKm: heatmap.bonkKm,
    chartHint: Number.isFinite(focusedEffectiveKm)
      ? `当前高亮：${selectedGelKm}km 补给，约 ${focusedEffectiveKm}km 开始生效。`
      : "糖原下降斜率越陡，后程掉速风险越高。",
  };
}

module.exports = {
  buildFuelerSimulationState,
  buildFuelerCheckpointState,
  normalizeFuelerSliderValue,
};
