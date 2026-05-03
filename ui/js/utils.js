export const COLORS = {
  bg: '#0D1117',
  line: '#00F2FF',
  warn: '#FF8C00',
  pulse: '#B347FF',
  grid: '#212B36',
  muted: '#8B949E',
};

export function toHHMMSS(totalSec) {
  const s = Math.round(totalSec);
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

export function debounce(fn, ms = 120) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
