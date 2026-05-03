import { fetchSimulation, fetchCoachAdvice, buildRequestBody } from './api.js?v=20261117';
import { createChartController } from './chart.v20261103.js?v=20261117';
import { attachAscentDrag, updateCards, updateInstantLabels } from './controls.js?v=20261117';
import {
  applyCoachAdvice,
  applyEngineCardState,
  markCoachStale,
  showCoachLoading,
  showCoachUnavailable,
} from './coach_ui.js?v=20261108';
import { debounce } from './utils.js?v=20261105';

const els = {
  finishTime: document.getElementById('finishTime'),
  strategyText: document.getElementById('strategyText'),
  strategyPlans: document.getElementById('strategyPlans'),
  strategyStatus: document.getElementById('strategyStatus'),
  strategySource: document.getElementById('strategySource'),
  strategyWarning: document.getElementById('strategyWarning'),
  gelRow: document.getElementById('gelRow'),
  bonkGlow: document.getElementById('bonkGlow'),
  optBtn: document.getElementById('optBtn'),
  drawer: document.getElementById('drawer'),
  drawerHandle: document.getElementById('drawerHandle'),
  weight: document.getElementById('weight'),
  vdot: document.getElementById('vdot'),
  pace: document.getElementById('pace'),
  loading: document.getElementById('loading'),
  ambientTemp: document.getElementById('ambientTemp'),
  gelCarb: document.getElementById('gelCarb'),
  weightVal: document.getElementById('weightVal'),
  weightHint: document.getElementById('weightHint'),
  vdotVal: document.getElementById('vdotVal'),
  vdotHint: document.getElementById('vdotHint'),
  paceVal: document.getElementById('paceVal'),
  paceHint: document.getElementById('paceHint'),
  loadingVal: document.getElementById('loadingVal'),
  loadingHint: document.getElementById('loadingHint'),
  ambientTempVal: document.getElementById('ambientTempVal'),
  ambientTempHint: document.getElementById('ambientTempHint'),
  gelCarbVal: document.getElementById('gelCarbVal'),
  gelCarbHint: document.getElementById('gelCarbHint'),
  intensityVal: document.getElementById('intensityVal'),
  intensityBar: document.getElementById('intensityBar'),
  intensityHint: document.getElementById('intensityHint'),
  gelCount: document.getElementById('gelCount'),
  gelMinus: document.getElementById('gelMinus'),
  gelPlus: document.getElementById('gelPlus'),
};

const state = {
  optimize: false,
  scanTimer: null,
  coachSeq: 0,
  coachStatus: 'idle',
  climb: { start: 0, mid: 0, end: 0 },
};
const chartCtrl = createChartController(document.getElementById('chart'), els.finishTime, els.bonkGlow);

async function requestCoachSuggestion(requestBody, seq) {
  try {
    const response = await fetchCoachAdvice(requestBody);
    if (seq !== state.coachSeq) return;
    state.coachStatus = 'ready';
    if (response.error || !response.advice) {
      state.coachStatus = 'failed';
      showCoachUnavailable(els);
      return;
    }
    applyCoachAdvice(els, response.advice);
  } catch (err) {
    if (seq !== state.coachSeq) return;
    state.coachStatus = 'failed';
    showCoachUnavailable(els);
  } finally {
    els.optBtn.textContent = state.optimize ? '\u5173\u95ed\u4f18\u5316' : '\u4f18\u5316\u5efa\u8bae';
  }
}

async function recomputeAndRender({ requestCoach = false, markStale = true } = {}) {
  const requestBody = buildRequestBody(state, els);
  const payload = await fetchSimulation(requestBody);
  if (payload.error) return console.error(payload.error);

  updateCards(payload, els);
  applyEngineCardState(els);
  chartCtrl.render(payload);

  if (requestCoach) {
    state.coachStatus = 'loading';
    const seq = ++state.coachSeq;
    showCoachLoading(els);
    requestCoachSuggestion(requestBody, seq);
  } else if (markStale) {
    state.coachStatus = 'dirty';
    markCoachStale(els);
  }
}

const onInputChanged = debounce(async () => {
  updateInstantLabels(els);
  await recomputeAndRender({ requestCoach: false, markStale: true });
}, 140);

function attachEvents() {
  [
    els.weight,
    els.vdot,
    els.pace,
    els.loading,
    els.ambientTemp,
    els.gelCarb,
  ].forEach(el => el.addEventListener('input', onInputChanged));

  els.gelMinus.addEventListener('click', async () => {
    els.gelCount.textContent = String(Math.max(0, Number(els.gelCount.textContent) - 1));
    await recomputeAndRender({ requestCoach: false, markStale: true });
  });
  els.gelPlus.addEventListener('click', async () => {
    els.gelCount.textContent = String(Number(els.gelCount.textContent) + 1);
    await recomputeAndRender({ requestCoach: false, markStale: true });
  });

  els.drawerHandle.onclick = () => els.drawer.classList.toggle('open');

  els.optBtn.onclick = async () => {
    if (state.coachStatus === 'loading') return;

    state.optimize = !state.optimize;
    els.optBtn.textContent = '\u4f18\u5316\u4e2d...';
    chartCtrl.chart.setOption({
      series: [
        { lineStyle: { color: '#6b7280' } },
        { lineStyle: { color: '#6b7280' } },
        { lineStyle: { color: '#374151' } },
        { itemStyle: { color: '#5b3b75' } },
        { itemStyle: { color: '#5b3b75' } },
        {},
      ],
    });

    if (state.scanTimer) clearTimeout(state.scanTimer);
    state.scanTimer = setTimeout(async () => {
      await recomputeAndRender({ requestCoach: true, markStale: false });
    }, 420);
  };

  attachAscentDrag(state, () => recomputeAndRender({ requestCoach: false, markStale: true }));
  window.addEventListener('resize', () => chartCtrl.chart.resize());
}

(async function init() {
  updateInstantLabels(els);
  attachEvents();
  await recomputeAndRender({ requestCoach: false, markStale: true });
})();
