const MARATHON_KM = 42;
const MARATHON_DISTANCE_KM = 42.195;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 1) {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatPace(secondsPerKm) {
  const sec = Math.max(1, Math.round(secondsPerKm));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}'${String(s).padStart(2, "0")}"`;
}

function linearInterpolate(x, x1, y1, x2, y2) {
  if (x2 === x1) return y1;
  return y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
}

function calculateCarbRatio(intensity) {
  if (intensity < 0.6) return 0.5;
  if (intensity > 0.95) return 1.0;
  if (intensity <= 0.8) return linearInterpolate(intensity, 0.6, 0.5, 0.8, 0.82);
  if (intensity <= 0.88) return linearInterpolate(intensity, 0.8, 0.82, 0.88, 0.92);
  return linearInterpolate(intensity, 0.88, 0.92, 0.95, 1.0);
}

function buildAutoGelPoints(gelCount) {
  const count = clamp(Math.round(gelCount), 0, 20);
  if (count <= 0) return [];
  if (count === 1) return [6];

  const points = [];
  for (let i = 0; i < count; i += 1) {
    const ratio = count === 1 ? 0 : i / (count - 1);
    const km = Math.round(6 + ratio * (35 - 6));
    points.push(clamp(km, 5, 35));
  }

  const uniqueSorted = Array.from(new Set(points)).sort((a, b) => a - b);
  if (uniqueSorted[0] !== 6) uniqueSorted[0] = 6;
  if (uniqueSorted[uniqueSorted.length - 1] !== 35) {
    uniqueSorted[uniqueSorted.length - 1] = 35;
  }
  return uniqueSorted;
}

function getTempMultiplier(ambientTempC) {
  if (ambientTempC <= 15) return 1;
  return 1 + (ambientTempC - 15) * 0.01;
}

function simulateFueler(input) {
  const weight = clamp(Number(input.weightKg) || 55, 40, 100);
  const vdot = clamp(Number(input.vdot) || 50, 35, 75);
  const paceSec = clamp(Number(input.paceSecPerKm) || 300, 180, 480);
  const loading = clamp(Number(input.loadingPercent) || 90, 0, 100);
  const gelCount = clamp(Number(input.gelCount) || 6, 0, 20);
  const gelCarbG = clamp(Number(input.gelCarbG) || 25, 10, 60);
  const ambientTempC = clamp(Number(input.ambientTempC) || 12, -10, 40);
  const delayKm = 2;
  const maxAbsorbPerHour = clamp(Number(input.maxAbsorbPerHour) || 60, 30, 120);

  const autoGelPoints = buildAutoGelPoints(gelCount);
  const gelSources = autoGelPoints.map((km, idx) => ({
    id: idx,
    km,
    plannedG: gelCarbG,
    absorbedG: 0,
  }));
  const glycogenCap = weight * 7.5;
  let remaining = glycogenCap * (loading / 100);
  let totalAbsorbed = 0;
  let elapsedMin = 0;
  let bonkKm = null;
  let absorbCapTriggered = false;
  const series = [];
  const pendingByKm = {};
  const absorbedEvents = [];

  gelSources.forEach((source) => {
    const effectiveKm = clamp(source.km + delayKm, 1, MARATHON_KM);
    pendingByKm[effectiveKm] = pendingByKm[effectiveKm] || [];
    pendingByKm[effectiveKm].push({ sourceId: source.id, g: source.plannedG });
  });

  const currentVelocity = 60000 / paceSec;
  const vdotVelocity = 30 + vdot * 4.2;
  const intensity = currentVelocity / vdotVelocity;
  const carbRatio = calculateCarbRatio(intensity);
  const tempMultiplier = getTempMultiplier(ambientTempC);

  for (let km = 1; km <= MARATHON_KM; km += 1) {
    const kcalPerKm = weight;
    const gBurned = (kcalPerKm * carbRatio * tempMultiplier) / 4;

    const intakeQueue = (pendingByKm[km] || [])
      .slice()
      .sort((a, b) => a.sourceId - b.sourceId);
    if (pendingByKm[km] && pendingByKm[km].length > 0) {
      delete pendingByKm[km];
    }
    const intakeNeed = intakeQueue.reduce((sum, item) => sum + item.g, 0);

    const rollingStart = elapsedMin - 60;
    while (absorbedEvents.length > 0 && absorbedEvents[0].timeMin < rollingStart) {
      absorbedEvents.shift();
    }
    const rollingTotal = absorbedEvents.reduce((sum, item) => sum + item.g, 0);
    const available = Math.max(0, maxAbsorbPerHour - rollingTotal);
    let absorbLeft = available;
    let absorbed = 0;
    const carryQueue = [];
    intakeQueue.forEach((chunk) => {
      if (absorbLeft <= 0) {
        carryQueue.push(chunk);
        return;
      }
      const taken = Math.min(chunk.g, absorbLeft);
      absorbed += taken;
      absorbLeft -= taken;
      gelSources[chunk.sourceId].absorbedG += taken;
      if (taken < chunk.g) {
        carryQueue.push({ sourceId: chunk.sourceId, g: chunk.g - taken });
      }
    });

    if (carryQueue.length > 0) {
      absorbCapTriggered = true;
    }
    if (carryQueue.length > 0 && km < MARATHON_KM) {
      pendingByKm[km + 1] = (pendingByKm[km + 1] || []).concat(carryQueue);
    }

    remaining = remaining - gBurned + absorbed;
    totalAbsorbed += absorbed;

    if (absorbed > 0) {
      absorbedEvents.push({ timeMin: elapsedMin, g: absorbed });
    }

    if (bonkKm === null && remaining < 0) {
      bonkKm = km;
    }

    series.push({
      km,
      remainingG: round(remaining, 1),
      intensity: round(intensity, 2),
      absorbedG: round(absorbed, 1),
      isBonk: bonkKm === km,
    });

    elapsedMin += paceSec / 60;
  }

  const gelDiagnostics = gelSources.map((source, idx) => ({
    seq: idx + 1,
    km: source.km,
    plannedG: round(source.plannedG, 1),
    absorbedG: round(source.absorbedG, 1),
    limited: source.absorbedG < source.plannedG - 0.05,
  }));
  const absorbLimitDetected = gelDiagnostics.some((item) => item.limited);

  return {
    params: {
      weight,
      vdot,
      paceSec,
      loading,
      gelCount,
      gelCarbG,
      ambientTempC,
      maxAbsorbPerHour,
    },
    summary: {
      finishTime: formatDuration(paceSec * MARATHON_DISTANCE_KM),
      finishPace: formatPace(paceSec),
      carbRatio: round(carbRatio, 2),
      tempMultiplier: round(tempMultiplier, 2),
      bonkKm,
      endRemainingG: round(series[series.length - 1].remainingG, 1),
      gelPoints: autoGelPoints,
      absorbedTotalG: round(totalAbsorbed, 1),
      gelDiagnostics,
      maxAbsorbPerHour,
      absorbLimitDetected,
      absorbCapTriggered,
    },
    series,
  };
}

module.exports = {
  simulateFueler,
  formatPace,
  formatDuration,
};
