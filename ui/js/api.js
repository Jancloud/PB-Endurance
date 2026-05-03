export async function fetchSimulation(payload) {
  const res = await fetch('/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function fetchCoachAdvice(payload) {
  const res = await fetch('/api/coach-advice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export function buildRequestBody(state, els) {
  return {
    weight_kg: Number(els.weight.value),
    vdot: Number(els.vdot.value),
    pace_sec_per_km: Number(els.pace.value),
    loading_percent: Number(els.loading.value),
    gel_count: Number(els.gelCount.textContent),
    ambient_temp_c: Number(els.ambientTemp.value),
    gel_carb_g: Number(els.gelCarb.value),
    total_climb_m: state.climb.start + state.climb.mid + state.climb.end,
    climb_start_m: state.climb.start,
    climb_mid_m: state.climb.mid,
    climb_end_m: state.climb.end,
    optimize: state.optimize,
  };
}
