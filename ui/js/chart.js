import { COLORS } from './utils.js?v=20261101';

export function createChartController(chartEl, finishTimeEl, bonkGlowEl) {
  const chart = echarts.init(chartEl);
  let blinkTimer = null;

  function stopBlink() {
    if (blinkTimer) {
      clearInterval(blinkTimer);
      blinkTimer = null;
    }
  }

  function blinkBonk(km, g) {
    stopBlink();
    let large = false;
    blinkTimer = setInterval(() => {
      large = !large;
      chart.setOption({
        series: [
          {},
          {},
          {
            type: 'scatter',
            data: [[km, g]],
            symbolSize: large ? 20 : 12,
            itemStyle: { color: COLORS.warn },
            label: { show: true, formatter: '撞墙', color: COLORS.warn, position: 'top' },
          },
        ],
      });
    }, 320);
  }

  function render(payload, lineColor = COLORS.line, pulseColor = COLORS.pulse) {
    const points = payload.series;
    const gels = new Set(payload.summary.gel_points || []);
    const x = points.map(p => p.km);
    const y = points.map(p => p.glycogen_level);
    const pulses = points.map(p => (gels.has(p.km) ? [p.km, p.glycogen_level] : null)).filter(Boolean);
    const bonk = points.find(p => p.is_bonk);

    chart.setOption({
      backgroundColor: COLORS.bg,
      animationDuration: 280,
      grid: { left: 44, right: 20, top: 28, bottom: 36 },
      xAxis: { type: 'category', data: x, axisLine: { lineStyle: { color: '#30363D' } }, axisLabel: { color: COLORS.muted } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: '#30363D' } }, axisLabel: { color: COLORS.muted }, splitLine: { lineStyle: { color: COLORS.grid } } },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(13,17,23,0.94)',
        borderColor: COLORS.line,
        textStyle: { color: '#E6EDF3' },
        formatter: items => {
          const p = points[items[0].dataIndex];
          return `第 ${p.km} 公里<br/>剩余糖原: ${p.glycogen_level} g<br/>配速: ${p.pace_sec_per_km}s/km<br/>糖原变化: ${p.delta_g} g`;
        },
      },
      series: [
        { type: 'line', smooth: true, data: y, lineStyle: { width: 2, color: lineColor }, areaStyle: { color: 'rgba(0,242,255,0.08)' } },
        { type: 'effectScatter', data: pulses, symbolSize: 8, itemStyle: { color: pulseColor }, rippleEffect: { color: pulseColor } },
        bonk ? { type: 'scatter', data: [[bonk.km, bonk.glycogen_level]], symbolSize: 14, itemStyle: { color: COLORS.warn }, label: { show: true, formatter: '撞墙', color: COLORS.warn, position: 'top' } } : { type: 'scatter', data: [] },
      ],
      markLine: { symbol: 'none', lineStyle: { color: '#F55', opacity: 0.4 }, data: [{ yAxis: 15 }] },
    }, true);

    if (bonk) {
      finishTimeEl.style.color = COLORS.warn;
      bonkGlowEl.style.opacity = '1';
      blinkBonk(bonk.km, bonk.glycogen_level);
    } else {
      finishTimeEl.style.color = COLORS.line;
      bonkGlowEl.style.opacity = '0';
      stopBlink();
    }
  }

  return { chart, render, stopBlink };
}

