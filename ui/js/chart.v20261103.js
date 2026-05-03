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

function resolveTooltipPosition(isMobile, size) {
  if (!isMobile) return null;
  const x = 8;
  const y = Math.max(8, size.viewSize[1] - size.contentSize[1] - 12);
  return [x, y];
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
        series: [{}, {}, {}, { data: [[km, g]], symbolSize: large ? 20 : 12 }],
      });
    }, 320);
  }

  function render(payload, lineColor = COLORS.line, pulseColor = COLORS.pulse) {
    const isMobile = window.innerWidth <= 720;
    const points = payload.series || [];
    const actionPulses = points.filter(point => point.ate_gel).map(point => [point.km, point.glycogen_level]);
    const bonk = points.find(point => point.is_bonk);
    const { safe, risk } = splitLineBySafety(points);
    const shadeStartKm = bonk ? bonk.km : 999;

    chart.setOption(
      {
        backgroundColor: COLORS.bg,
        animationDuration: 280,
        grid: {
          left: isMobile ? 38 : 44,
          right: isMobile ? 14 : 20,
          top: isMobile ? 20 : 28,
          bottom: isMobile ? 32 : 36,
        },
        xAxis: {
          type: 'value',
          min: 1,
          max: 42,
          interval: 1,
          axisLine: { lineStyle: { color: '#30363D' } },
          axisTick: { show: true, alignWithLabel: true },
          axisLabel: {
            color: COLORS.muted,
            formatter: value => {
              if (!isMobile) return String(value);
              if (value === 1 || value === 42 || (value - 1) % 4 === 0) return String(value);
              return '';
            },
          },
          splitLine: { show: false },
        },
        yAxis: {
          type: 'value',
          splitNumber: isMobile ? 4 : 6,
          axisLine: { lineStyle: { color: '#30363D' } },
          axisLabel: { color: COLORS.muted },
          splitLine: { lineStyle: { color: COLORS.grid, opacity: isMobile ? 0.45 : 1 } },
        },
        tooltip: {
          trigger: 'axis',
          confine: true,
          backgroundColor: 'rgba(13,17,23,0.94)',
          borderColor: COLORS.line,
          textStyle: { color: '#E6EDF3' },
          position: (pos, params, dom, rect, size) => resolveTooltipPosition(isMobile, size),
          formatter: items => {
            const point = points[items[0].dataIndex];
            if (!point) return '';
            const action = point.ate_gel ? '\u662f' : '\u5426';
            return `\u7b2c ${point.km} \u516c\u91cc<br/>\u5269\u4f59\u7cd6\u539f: ${point.glycogen_level} g<br/>\u914d\u901f: ${point.pace_sec_per_km}s/km<br/>\u7cd6\u539f\u53d8\u5316: ${point.delta_g} g<br/>\u5403\u80f6\u52a8\u4f5c: ${action}`;
          },
        },
        series: [
          {
            type: 'line',
            smooth: true,
            showSymbol: false,
            data: safe,
            lineStyle: { width: isMobile ? 2.5 : 2, color: lineColor },
            areaStyle: { color: 'rgba(0,242,255,0.08)' },
          },
          {
            type: 'line',
            smooth: true,
            showSymbol: false,
            data: risk,
            lineStyle: { width: isMobile ? 2.5 : 2, color: '#FF5D5D', type: 'dashed' },
          },
          {
            type: 'scatter',
            data: actionPulses,
            symbolSize: isMobile ? 12 : 10,
            z: 8,
            itemStyle: { color: pulseColor, borderColor: '#EFE8FF', borderWidth: 1 },
          },
          bonk
            ? {
                type: 'scatter',
                data: [[bonk.km, bonk.glycogen_level]],
                symbolSize: isMobile ? 16 : 14,
                itemStyle: { color: COLORS.warn },
                label: { show: true, formatter: '\u649e\u5899', color: COLORS.warn, position: 'top' },
              }
            : { type: 'scatter', data: [] },
        ],
        markLine: {
          symbol: 'none',
          lineStyle: { color: '#F55', opacity: 0.4 },
          data: [{ yAxis: 15 }],
        },
        markArea: bonk
          ? {
              silent: true,
              itemStyle: { color: 'rgba(255,80,80,0.12)' },
              label: {
                color: '#FF9A9A',
                formatter: isMobile ? '\u80fd\u91cf\u771f\u7a7a\u533a' : '\u80fd\u91cf\u771f\u7a7a\u533a\uff1a\u9884\u8ba1\u6bcf\u516c\u91cc\u6389\u901f 15-30 \u79d2',
              },
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
