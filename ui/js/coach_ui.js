function mapStatusToClass(status) {
  if (status === '安全' || status === 'safe') return 'strategy-safe';
  if (status === '撞墙' || status === 'bonk') return 'strategy-bonk';
  return 'strategy-risk';
}

function mapStatusToPillClass(status) {
  if (status === '安全' || status === 'safe') return 'pill pill-safe';
  if (status === '撞墙' || status === 'bonk') return 'pill pill-bonk';
  return 'pill pill-risk';
}

function setStatusPill(els, statusText) {
  if (!els.strategyStatus) return;
  els.strategyStatus.className = mapStatusToPillClass(statusText);
  els.strategyStatus.textContent = statusText;
}

function setSourcePill(els, sourceText) {
  if (!els.strategySource) return;
  els.strategySource.className = 'pill pill-source';
  els.strategySource.textContent = sourceText;
}

function setWarning(els, text) {
  if (!els.strategyWarning) return;
  els.strategyWarning.textContent = text || '';
}

export function applyEngineCardState(els) {
  const statusText = els.strategyText.classList.contains('strategy-safe')
    ? '安全'
    : els.strategyText.classList.contains('strategy-bonk')
      ? '撞墙'
      : '风险';
  setStatusPill(els, statusText);
  setSourcePill(els, '数值引擎');
  setWarning(els, '数值引擎已完成。');
}

export function markCoachStale(els) {
  setSourcePill(els, '待刷新');
  setWarning(els, '参数已变更，请点击“优化建议”刷新教练方案。');
  if (els.strategyPlans) {
    els.strategyPlans.innerHTML = '<p>等待你点击“优化建议”后生成 DeepSeek 教练建议。</p>';
  }
}

export function showCoachLoading(els) {
  setSourcePill(els, 'DeepSeek 连接中');
  setWarning(els, '教练正在读取你的赛程报告并生成战术建议。');
  if (!els.strategyPlans) return;
  els.strategyPlans.innerHTML = `
    <div class="coach-loading">
      <span class="coach-dot"></span>
      <span>教练建议生成中...</span>
    </div>
  `;
}

export function applyCoachAdvice(els, advice) {
  if (!advice) return;
  const statusText = advice.status || '风险';
  els.strategyText.classList.remove('strategy-safe', 'strategy-risk', 'strategy-bonk');
  els.strategyText.classList.add(mapStatusToClass(statusText));
  els.strategyText.textContent = advice.headline || '建议暂不可用';

  setStatusPill(els, statusText);
  setSourcePill(els, advice.source === 'llm' ? 'DeepSeek 教练' : '本地回退');
  setWarning(els, advice.key_warning || '教练建议已就绪，建议结合体感执行。');

  const lines = [advice.plan_a, advice.plan_b, advice.plan_c].filter(Boolean);
  if (els.strategyPlans) {
    els.strategyPlans.innerHTML = lines.map(line => `<p>${line}</p>`).join('');
  }
}

export function showCoachUnavailable(els) {
  setSourcePill(els, '教练离线');
  setWarning(els, '教练服务暂不可用，当前已保留数值引擎建议。');
  if (els.strategyPlans) {
    els.strategyPlans.innerHTML = '<p>教练服务暂不可用，已保留本地策略。</p>';
  }
}
