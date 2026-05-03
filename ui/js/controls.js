import { toHHMMSS } from './utils.js?v=20261105';
import { buildStrategySummary } from './strategy.js?v=20261105';

const VDOT_ANCHORS = [
  { vdot: 40.0, hm: '01:40:00', fm: '03:35:00' },
  { vdot: 45.0, hm: '01:33:30', fm: '03:18:00' },
  { vdot: 50.0, hm: '01:27:30', fm: '03:08:00' },
  { vdot: 54.9, hm: '01:24:00', fm: '03:00:00' },
  { vdot: 57.0, hm: '01:21:30', fm: '02:54:00' },
  { vdot: 60.0, hm: '01:18:00', fm: '02:46:00' },
  { vdot: 65.0, hm: '01:11:30', fm: '02:31:00' },
];

function hmsToSec(hms) {
  const [h, m, s] = hms.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

function secToHms(sec) {
  return toHHMMSS(sec);
}

function formatPace(secondsPerKm) {
  const total = Math.max(1, Math.round(secondsPerKm));
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, '0');
  return `${m}'${s}"`;
}

function resolveVdotAnchor(vdot) {
  const anchors = [...VDOT_ANCHORS].sort((a, b) => a.vdot - b.vdot);
  if (vdot <= anchors[0].vdot) return anchors[0];
  if (vdot >= anchors[anchors.length - 1].vdot) return anchors[anchors.length - 1];

  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (vdot >= a.vdot && vdot <= b.vdot) {
      const r = (vdot - a.vdot) / (b.vdot - a.vdot);
      const hmSec = hmsToSec(a.hm) + (hmsToSec(b.hm) - hmsToSec(a.hm)) * r;
      const fmSec = hmsToSec(a.fm) + (hmsToSec(b.fm) - hmsToSec(a.fm)) * r;
      return { vdot, hm: secToHms(hmSec), fm: secToHms(fmSec) };
    }
  }
  return anchors[anchors.length - 1];
}

function resolveCarbStatus(loadingPercent) {
  if (loadingPercent >= 90) return '完美装载（3天高碳水方案）';
  if (loadingPercent >= 70) return '良好（赛前1天认真补碳）';
  if (loadingPercent >= 50) return '一般（正常饮食，无额外补碳）';
  return '不足（可能存在空腹感）';
}

export function updateInstantLabels(els) {
  const weight = Number(els.weight.value);
  const vdot = Number(els.vdot.value);
  const paceSec = Number(els.pace.value);
  const loading = Number(els.loading.value);
  const ambientTemp = Number(els.ambientTemp.value);
  const gelCarb = Number(els.gelCarb.value);
  const finishTime = toHHMMSS(paceSec * 42.195);

  els.weightVal.textContent = String(weight);
  els.vdotVal.textContent = vdot.toFixed(1);
  els.paceVal.textContent = formatPace(paceSec);
  els.loadingVal.textContent = String(loading);
  els.ambientTempVal.textContent = String(ambientTemp);
  els.gelCarbVal.textContent = String(gelCarb);
  els.finishTime.textContent = finishTime;

  els.paceHint.textContent = `${paceSec}s/km · 42.195km 预计完赛：${finishTime}`;
  const anchor = resolveVdotAnchor(vdot);
  els.vdotHint.textContent = `半马锚点 ${anchor.hm} · 全马锚点 ${anchor.fm}`;
  els.loadingHint.textContent = `装载状态：${resolveCarbStatus(loading)}`;
  if (els.ambientTempHint) {
    if (ambientTemp <= 15) {
      els.ambientTempHint.textContent = `${ambientTemp}°C：接近黄金温度，额外热损耗≈0%`;
    } else {
      const extra = (ambientTemp - 15).toFixed(0);
      els.ambientTempHint.textContent = `${ambientTemp}°C：高温修正已开启，糖耗系数 +${extra}%`;
    }
  }
  if (els.gelCarbHint) {
    els.gelCarbHint.textContent = `当前按 ${gelCarb}g/支计算，请与实际胶规格保持一致`;
  }
  if (els.weightHint) els.weightHint.textContent = '体重直接影响基础能耗与糖原储备上限';

  const vel = 60000 / paceSec;
  const vdotVel = 30 + vdot * 4.2;
  const intensity = vel / vdotVel;
  els.intensityVal.textContent = intensity.toFixed(2);
  els.intensityBar.value = intensity;
  if (els.intensityHint) {
    els.intensityHint.textContent = intensity >= 0.88
      ? '挑战区：心率可能接近乳酸阈值'
      : '可控区：建议按补给计划稳定推进';
  }
}

export function updateCards(payload, els) {
  els.finishTime.textContent = payload.summary.finish_time;

  const strategy = buildStrategySummary(payload, {
    vdot: Number(els.vdot.value),
    paceSecPerKm: Number(els.pace.value),
    loading: Number(els.loading.value),
    gelCount: Number(els.gelCount.textContent),
    intensity: Number(els.intensityVal.textContent),
  });

  els.strategyText.classList.remove('strategy-safe', 'strategy-risk', 'strategy-bonk');
  els.strategyText.classList.add(strategy.statusClass);
  els.strategyText.textContent = strategy.summaryText;

  if (els.strategyPlans) {
    els.strategyPlans.innerHTML = strategy.plans.map(plan => `<p>${plan}</p>`).join('');
  }
  if (els.intensityHint) {
    els.intensityHint.textContent = strategy.intensityHint;
  }

  const gelPoints = payload.summary.gel_points || [];
  const gelCarb = Number(payload.summary.gel_carb_g || 25);
  const plannedTotal = Number(payload.summary.planned_race_gel_carb_total_g || 0);
  const absorbedTotal = Number(payload.summary.absorbed_total_g || 0);
  const pointsHtml = gelPoints.map(k => `<span class="gel">补 ${k}km</span>`).join('');
  const statHtml = `<span class="gel">每支 ${gelCarb}g · 计划总补给 ${plannedTotal}g · 已吸收 ${absorbedTotal.toFixed(1)}g</span>`;
  els.gelRow.innerHTML = `${statHtml}${pointsHtml}`;
}

export function attachAscentDrag(state, onReleased) {
  document.querySelectorAll('.segment').forEach(seg => {
    const key = seg.dataset.key;
    let active = false;
    let startY = 0;
    let startV = 0;

    seg.addEventListener('mousedown', e => {
      active = true;
      startY = e.clientY;
      startV = state.climb[key];
    });

    window.addEventListener('mousemove', e => {
      if (!active) return;
      const nv = Math.max(0, Math.min(700, Math.round(startV + (startY - e.clientY) * 2)));
      state.climb[key] = nv;
      document.getElementById(`climb${key.charAt(0).toUpperCase() + key.slice(1)}`).textContent = `${nv}m`;
      seg.style.background = `linear-gradient(180deg, rgba(0,242,255,${0.1 + nv / 1400}), rgba(0,0,0,0.2))`;
    });

    window.addEventListener('mouseup', () => {
      if (!active) return;
      active = false;
      onReleased();
    });
  });
}
