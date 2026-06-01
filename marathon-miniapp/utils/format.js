function formatDuration(seconds = 0) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatPace(secondsPerKm) {
  if (!secondsPerKm || !Number.isFinite(secondsPerKm)) {
    return "--";
  }
  const min = Math.floor(secondsPerKm / 60);
  const sec = Math.round(secondsPerKm % 60);
  return `${min}'${String(sec).padStart(2, "0")}/km`;
}

function km(valueMeters = 0) {
  return Number((valueMeters / 1000).toFixed(2));
}

function meters(valueKm = 0) {
  return Math.round(valueKm * 1000);
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

module.exports = {
  formatDuration,
  formatPace,
  km,
  meters,
  safeNumber,
};
