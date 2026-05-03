import { fetchSimulation, fetchCoachAdvice, buildRequestBody } from './api.js?v=20261120';
import { createChartController } from './chart.v20261103.js?v=20261120';
import { updateCards, updateInstantLabels } from './controls.js?v=20261120';
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
  drawerConclusion: document.getElementById('drawerConclusion'),
  advancedToggle: document.getElementById('advancedToggle'),
  advancedPanel: document.getElementById('advancedPanel'),
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

const DRAWER_STATES = ['peek', 'half', 'full'];

const state = {
  optimize: false,
  scanTimer: null,
  coachSeq: 0,
  coachStatus: 'idle',
  drawerState: 'peek',
  advancedOpen: false,
  dragCtx: null,
  lastDrawerDragAt: 0,
};

const chartCtrl = createChartController(document.getElementById('chart'), els.finishTime, els.bonkGlow);

function isMobileViewport() {
  return window.matchMedia('(max-width: 720px)').matches;
}

function setAdvancedOpen(isOpen) {
  if (!els.advancedPanel || !els.advancedToggle) return;
  state.advancedOpen = Boolean(isOpen);
  els.advancedPanel.classList.toggle('open', state.advancedOpen);
  els.advancedToggle.textContent = state.advancedOpen ? '收起高级参数' : '展开高级参数';
}

function setDrawerState(nextState) {
  if (!DRAWER_STATES.includes(nextState)) return;
  state.drawerState = nextState;

  if (isMobileViewport()) {
    els.drawer.dataset.state = nextState;
    els.drawer.classList.remove('open');
    els.drawer.style.height = '';
    if (nextState !== 'full' && state.advancedOpen) setAdvancedOpen(false);
    return;
  }

  els.drawer.dataset.state = '';
  els.drawer.classList.toggle('open', nextState !== 'peek');
}

function cycleDrawerState() {
  if (!isMobileViewport()) {
    els.drawer.classList.toggle('open');
    return;
  }
  if (state.drawerState === 'peek') return setDrawerState('half');
  if (state.drawerState === 'half') return setDrawerState('full');
  return setDrawerState('peek');
}

function getTouchY(evt) {
  if (evt.touches && evt.touches.length > 0) return evt.touches[0].clientY;
  if (evt.changedTouches && evt.changedTouches.length > 0) return evt.changedTouches[0].clientY;
  return evt.clientY;
}

function getDrawerHeights() {
  const vh = window.innerHeight;
  const peek = 44;
  const half = Math.max(340, Math.min(Math.round(vh * 0.56), 520));
  const full = Math.max(half + 120, Math.min(Math.round(vh * 0.88), Math.round(vh - 10)));
  return { peek, half, full };
}

function closestDrawerState(heightPx) {
  const sizes = getDrawerHeights();
  return Object.entries(sizes).reduce((best, current) => {
    const [stateName, size] = current;
    if (!best) return { stateName, diff: Math.abs(heightPx - size) };
    const diff = Math.abs(heightPx - size);
    return diff < best.diff ? { stateName, diff } : best;
  }, null).stateName;
}

function onDrawerDragStart(evt) {
  if (!isMobileViewport()) return;
  state.dragCtx = {
    startY: getTouchY(evt),
    startHeight: els.drawer.getBoundingClientRect().height,
    moved: false,
  };
  els.drawer.classList.add('dragging');
}

function onDrawerDragMove(evt) {
  if (!state.dragCtx || !isMobileViewport()) return;
  const y = getTouchY(evt);
  const delta = state.dragCtx.startY - y;
  const sizes = getDrawerHeights();
  const nextHeight = Math.max(sizes.peek, Math.min(sizes.full, state.dragCtx.startHeight + delta));
  if (Math.abs(delta) > 5) state.dragCtx.moved = true;
  els.drawer.style.height = `${Math.round(nextHeight)}px`;
  if (evt.cancelable) evt.preventDefault();
}

function onDrawerDragEnd() {
  if (!state.dragCtx || !isMobileViewport()) return;
  const draggedHeight = Number.parseFloat(els.drawer.style.height) || els.drawer.getBoundingClientRect().height;
  const target = closestDrawerState(draggedHeight);
  els.drawer.classList.remove('dragging');
  els.drawer.style.height = '';
  setDrawerState(target);
  if (state.dragCtx.moved) state.lastDrawerDragAt = Date.now();
  state.dragCtx = null;
}

function updateDrawerConclusion(strategy) {
  if (!els.drawerConclusion || !strategy) return;
  const level = strategy.level || 'risk';
  const km = strategy.bonkKm ? `${strategy.bonkKm}km` : '后程';

  els.drawerConclusion.classList.remove('safe', 'risk', 'bonk');
  if (level === 'safe') {
    els.drawerConclusion.classList.add('safe');
    els.drawerConclusion.textContent = '当前配速可控，预计可稳定完赛。';
    return;
  }
  if (level === 'bonk') {
    els.drawerConclusion.classList.add('bonk');
    els.drawerConclusion.textContent = `预计 ${km} 撞墙，优先调整后程配速。`;
    return;
  }
  els.drawerConclusion.classList.add('risk');
  els.drawerConclusion.textContent = '后程风险上升，建议预留 5-10 秒配速余量。';
}

function syncDrawerByViewport() {
  if (isMobileViewport()) {
    els.drawer.classList.remove('open');
    els.drawer.dataset.state = state.drawerState;
    return;
  }

  els.drawer.style.height = '';
  els.drawer.dataset.state = '';
  if (state.drawerState === 'peek') {
    els.drawer.classList.remove('open');
  } else {
    els.drawer.classList.add('open');
  }
}

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
    els.optBtn.textContent = state.optimize ? '关闭优化' : '优化建议';
  }
}

async function recomputeAndRender({ requestCoach = false, markStale = true } = {}) {
  const requestBody = buildRequestBody(state, els);
  const payload = await fetchSimulation(requestBody);
  if (payload.error) return console.error(payload.error);

  const strategy = updateCards(payload, els);
  updateDrawerConclusion(strategy);
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

  els.drawerHandle.onclick = () => {
    if (Date.now() - state.lastDrawerDragAt < 180) return;
    cycleDrawerState();
  };

  if (els.advancedToggle) {
    els.advancedToggle.onclick = () => {
      if (state.drawerState !== 'full' && isMobileViewport()) {
        setDrawerState('full');
      }
      setAdvancedOpen(!state.advancedOpen);
    };
  }

  els.drawerHandle.addEventListener('touchstart', onDrawerDragStart, { passive: true });
  window.addEventListener('touchmove', onDrawerDragMove, { passive: false });
  window.addEventListener('touchend', onDrawerDragEnd);
  els.drawerHandle.addEventListener('mousedown', onDrawerDragStart);
  window.addEventListener('mousemove', onDrawerDragMove);
  window.addEventListener('mouseup', onDrawerDragEnd);

  els.optBtn.onclick = async () => {
    if (state.coachStatus === 'loading') return;

    state.optimize = !state.optimize;
    els.optBtn.textContent = '优化中...';
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

  window.addEventListener('resize', () => {
    chartCtrl.chart.resize();
    syncDrawerByViewport();
  });
}

(async function init() {
  setDrawerState('peek');
  setAdvancedOpen(false);
  syncDrawerByViewport();
  updateInstantLabels(els);
  attachEvents();
  await recomputeAndRender({ requestCoach: false, markStale: true });
})();
