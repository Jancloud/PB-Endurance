const EVENT_OPTIONS = [
  { label: "5公里", distanceKm: 5 },
  { label: "10公里", distanceKm: 10 },
  { label: "半马", distanceKm: 21.0975 },
  { label: "全马", distanceKm: 42.195 },
];

const TRAINING_INTENSITIES = [
  { key: "easy", label: "轻松跑", fraction: 0.7, description: "恢复与有氧打底" },
  { key: "marathon", label: "马拉松配速", fraction: 0.84, description: "专项耐力训练" },
  { key: "threshold", label: "阈值跑", fraction: 0.88, description: "持续质量训练" },
  { key: "interval", label: "间歇跑", fraction: 0.98, description: "短间歇质量训练" },
];

function parseFinishTime(value) {
  const parts = String(value || "")
    .trim()
    .split(":")
    .map((part) => Number(part));

  if (parts.length !== 2 && parts.length !== 3) return null;
  if (parts.some((part) => !Number.isInteger(part) || part < 0)) return null;

  const [hours, minutes, seconds] = parts.length === 3 ? parts : [0, parts[0], parts[1]];
  if (seconds >= 60 || (parts.length === 3 && minutes >= 60)) return null;

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  return totalSeconds > 0 ? totalSeconds : null;
}

function formatPace(secondsPerKm) {
  const seconds = Math.round(secondsPerKm);
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}/km`;
}

function oxygenCost(speedMetersPerMinute) {
  return -4.6 + 0.182258 * speedMetersPerMinute + 0.000104 * speedMetersPerMinute ** 2;
}

function oxygenFraction(timeMinutes) {
  return (
    0.8 +
    0.1894393 * Math.exp(-0.012778 * timeMinutes) +
    0.2989558 * Math.exp(-0.1932605 * timeMinutes)
  );
}

function speedForOxygen(oxygen) {
  const a = 0.000104;
  const b = 0.182258;
  const c = -4.6 - oxygen;
  return (-b + Math.sqrt(b ** 2 - 4 * a * c)) / (2 * a);
}

function calculateVdot(distanceKm, finishSeconds) {
  const timeMinutes = finishSeconds / 60;
  const speed = (distanceKm * 1000) / timeMinutes;
  return oxygenCost(speed) / oxygenFraction(timeMinutes);
}

function buildTrainingPaces(vdot) {
  return TRAINING_INTENSITIES.map((intensity) => {
    const speed = speedForOxygen(vdot * intensity.fraction);
    return {
      key: intensity.key,
      label: intensity.label,
      description: intensity.description,
      pace: formatPace(60000 / speed),
    };
  });
}

function calculateVdotResult(distanceIndex, finishTime) {
  const event = EVENT_OPTIONS[Number(distanceIndex) || 0];
  const finishSeconds = parseFinishTime(finishTime);
  if (!event || !finishSeconds) return null;

  const vdot = calculateVdot(event.distanceKm, finishSeconds);
  if (!Number.isFinite(vdot) || vdot < 20 || vdot > 90) return null;

  return {
    eventLabel: event.label,
    finishTime: String(finishTime).trim(),
    vdot: vdot.toFixed(1),
    trainingPaces: buildTrainingPaces(vdot),
  };
}

module.exports = {
  EVENT_OPTIONS,
  calculateVdotResult,
  parseFinishTime,
};
