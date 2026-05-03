function formatPace(secondsPerKm) {
  const total = Math.max(1, Math.round(secondsPerKm));
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, '0');
  return `${m}'${s}"`;
}

function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseDurationToSec(hmsText) {
  if (typeof hmsText !== 'string') return null;
  const match = hmsText.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function classifyStatus(points, intensity) {
  const bonkPoint = points.find(p => p.is_bonk) || null;
  const minG = points.reduce((min, p) => Math.min(min, safeNumber(p.glycogen_level, 9999)), 9999);

  if (bonkPoint || minG < 0) {
    return { level: 'bonk', bonkPoint, minG };
  }
  if (minG <= 20 || intensity >= 0.9) {
    return { level: 'risk', bonkPoint: null, minG };
  }
  return { level: 'safe', bonkPoint: null, minG };
}

function isHighChallenge(vdot, paceSecPerKm) {
  return Math.abs(vdot - 53) <= 0.5 && Math.abs(paceSecPerKm - 257) <= 2;
}

function getStatusClass(level) {
  if (level === 'safe') return 'strategy-safe';
  if (level === 'risk') return 'strategy-risk';
  return 'strategy-bonk';
}

function resolveFinishGoalText(ctx) {
  const finishSec = Number.isFinite(ctx.finishSec)
    ? ctx.finishSec
    : parseDurationToSec(ctx.finishTime);
  if (!Number.isFinite(finishSec)) {
    return '完成当前完赛目标';
  }
  if (finishSec <= 3 * 3600) {
    return '冲击 3 小时大关';
  }
  return `稳住 ${ctx.finishTime || '当前'} 完赛目标`;
}

function buildRealtimeMessage(level, ctx, bonkPoint) {
  if (level === 'safe') {
    return `当前策略稳健。糖原储备充足，足以支持你以 ${formatPace(ctx.paceSecPerKm)} ${resolveFinishGoalText(ctx)}。`;
  }

  if (level === 'risk') {
    const base = `强度偏高（${ctx.intensity.toFixed(2)}）。建议赛前 3 天严格执行高碳水装载，或在 30km 后预留 5-10 秒的配速降幅。`;
    if (ctx.highChallenge) {
      return `${base} 你现在是高强度挑战档，赛前补碳执行度会直接影响后程稳定性。`;
    }
    return base;
  }

  const km = bonkPoint ? bonkPoint.km : '后程';
  return `存在风险！当前补给无法支撑目标配速。预计在 ${km}km 处糖原耗尽（撞墙点）。`;
}

function buildOptimizePlans(payload, ctx) {
  const strategy = payload.summary.optimization_strategy || {};
  const startKm = strategy.optimized_start_km || 35;
  const optimizedPace = strategy.optimized_pace || formatPace(ctx.paceSecPerKm + 8);
  const currentPace = formatPace(ctx.paceSecPerKm);
  const loadingBoost = Math.max(90, Math.min(95, Math.round(ctx.loading + 5)));

  return [
    `方案 A（优先执行）：${startKm}km 前维持 ${currentPace}，${startKm}km 后降到 ${optimizedPace}，先把完赛稳定性拉回来。`,
    `方案 B（赛前补碳）：将赛前补碳提高到 ${loadingBoost}% 左右，帮助你把“后程掉速区”向后推。`,
    `方案 C（补给补丁）：保持 ${ctx.gelCount} 根胶，18km 与 24km 两处增加含糖饮料，小改动就能显著缓解风险。`,
  ];
}

function getIntensityHint(intensity) {
  if (intensity < 0.8) return '有氧区：呼吸平稳，可持续性强';
  if (intensity < 0.88) return '马拉松区：可控但需按计划补给';
  if (intensity < 0.95) return '挑战区：心率可能接近乳酸阈值';
  return '高压区：对补碳与配速控制要求很高';
}

export function buildStrategySummary(payload, context) {
  const points = payload.series || [];
  const finishTime = payload?.summary?.finish_time || '';
  const finishSec = parseDurationToSec(finishTime);
  const mergedContext = {
    ...context,
    finishTime,
    finishSec,
    highChallenge: isHighChallenge(context.vdot, context.paceSecPerKm),
  };

  const status = classifyStatus(points, mergedContext.intensity);
  const summaryText = buildRealtimeMessage(status.level, mergedContext, status.bonkPoint);
  const mode = (payload.summary.optimization_strategy || {}).mode || 'disabled';
  const optimizeActive = mode === 'applied' || mode === 'failed';
  const plans = optimizeActive ? buildOptimizePlans(payload, mergedContext) : [];
  const headline = optimizeActive
    ? '优化建议：为了平稳完赛，建议尝试以下任一方案：'
    : summaryText;

  return {
    level: status.level,
    statusClass: getStatusClass(status.level),
    summaryText: headline,
    plans,
    intensityHint: getIntensityHint(mergedContext.intensity),
    bonkKm: status.bonkPoint ? status.bonkPoint.km : null,
    optimizeActive,
  };
}
