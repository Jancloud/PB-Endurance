import { COLORS } from './utils.js?v=20261103';

const SAFE_LINE_G = 20;

function splitLineBySafety(points) {
  const safe = [];
  const risk = [];
  points.forEach(point => {
    if (point.glycogen_level > SAFE_LINE_G) {
      safe.push([point.km, point.glycogen_level]);
      risk.push([point.km, null]);
    } else {
      safe.push([point.km, null]);
      risk.push([point.km, point.glycogen_level]);
    }
  });
  return { safe, risk };
}

export function createChartController(chartEl, finishTimeEl, bonkGlowEl) {
  const chart = echarts.init(chartEl);
  let blinkTimer = null;

  function stopBlink() {
    if (!blinkTimer) return;
    clearInterval(blinkTimer);
    blinkTimer = null;
  }

  function blinkBonk(km, g) {
    stopBlink();
    let large = false;
    blinkTimer = setInterval(() => {
      large = !large;
      chart.setOption({
        series: [{}, {}, {}, {}, {}, { data: [[km, g]], symbolSize: large ? 20 : 12 }],
      });
    }, 320);
  }

  function render(payload, lineColor = COLORS.line, pulseColor = COLORS.pulse) {
    const points = payload.series || [];
    const actionPulses = points.filter(point => point.ate_gel).map(point => [point.km, point.glycogen_level]);
    const bonk = points.find(point => point.is_bonk);
    const { safe, risk } = splitLineBySafety(points);
    const shadeStartKm = bonk ? bonk.km : 999;

    chart.setOption(
      {
        backgroundColor: COLORS.bg,
        animationDuration: 280,
        grid: { left: 44, right: 20, top: 28, bottom: 36 },
        xAxis: {
          type: 'value',
          min: 1,
          max: 42,
          interval: 2,
          axisLine: { lineStyle: { color: '#30363D' } },
          axisLabel: { color: COLORS.muted },
        },
        yAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: '#30363D' } },
          axisLabel: { color: COLORS.muted },
          splitLine: { lineStyle: { color: COLORS.grid } },
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(13,17,23,0.94)',
          borderColor: COLORS.line,
          textStyle: { color: '#E6EDF3' },
          formatter: items => {
            const point = points[items[0].dataIndex];
            if (!point) return '';
            const action = point.ate_gel ? '是' : '否';
            return `第 ${point.km} 公里<br/>剩余糖原: ${point.glycogen_level} g<br/>配速: ${point.pace_sec_per_km}s/km<br/>糖原变化: ${point.delta_g} g<br/>吃胶动作: ${action}`;
          },
        },
        series: [
          {
            name: '糖原曲线',
            type: 'line',
            smooth: true,
            showSymbol: false,
            data: safe,
            lineStyle: { width: 2, color: lineColor },
            areaStyle: { color: 'rgba(0,242,255,0.08)' },
          },
          {
            name: '糖原曲线',
            type: 'line',
            smooth: true,
            showSymbol: false,
            data: risk,
            lineStyle: { width: 2, color: '#FF5D5D', type: 'dashed' },
          },
          {
            name: '吃胶动作点',
            type: 'scatter',
            data: actionPulses,
            symbolSize: 10,
            z: 8,
            itemStyle: { color: '#9D78FF', borderColor: '#EFE8FF', borderWidth: 1 },
          },
          bonk
            ? {
                type: 'scatter',
                data: [[bonk.km, bonk.glycogen_level]],
                symbolSize: 14,
                itemStyle: { color: COLORS.warn },
                label: { show: true, formatter: 'BONK', color: COLORS.warn, position: 'top' },
              }
            : { type: 'scatter', data: [] },
        ],
        markLine: { symbol: 'none', lineStyle: { color: '#F55', opacity: 0.4 }, data: [{ yAxis: 15 }] },
        markArea: bonk
          ? {
              silent: true,
              itemStyle: { color: 'rgba(255,80,80,0.12)' },
              label: { color: '#FF9A9A', formatter: '能量真空区：预计每公里掉速 15-30 秒' },
              data: [[{ xAxis: shadeStartKm }, { xAxis: 42 }]],
            }
          : undefined,
      },
      true,
    );

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
