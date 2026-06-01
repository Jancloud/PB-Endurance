const {
  buildFuelerCheckpointState,
  buildFuelerSimulationState,
  normalizeFuelerSliderValue,
} = require("../../utils/fueler_state");
const { drawMainFuelerCurve, drawRearFuelerCurve } = require("../../utils/fueler_chart");

Page({
  data: {
    form: {
      weightKg: 55,
      vdot: 53.6,
      paceSecPerKm: 255,
      loadingPercent: 90,
      gelCount: 6,
      gelCarbG: 25,
      ambientTempC: 12,
      maxAbsorbPerHour: 60,
    },
    summary: {
      finishTime: "--:--:--",
      finishPace: "--",
      bonkKm: null,
      bonkKmText: "--",
      endRemainingText: "--",
      absorbedTotalG: 0,
      gelPoints: [],
      gelDiagnostics: [],
      absorbLimitHint: "",
      isRisk: false,
      sub3Hint: "",
      isSub3Edge: false,
      tangentPaceText: "",
    },
    gelTags: [],
    heatmapSegments: [],
    heatmapTicks: [],
    heatmapMarkers: [],
    heatmapCore: [],
    heatmapBonkLeft: "",
    heatmapBonkKm: null,
    selectedGelKm: null,
    chartWidth: 640,
    chartHeight: 220,
    rearChartWidth: 640,
    rearChartHeight: 220,
    chartHint: "糖原下降越陡，后程掉速风险越高。",
    paramHints: {
      vdotValue: "53.6",
      weight: "体重直接影响基础能耗与糖原储备上限",
      vdot: "成绩锚点：半马 1:25 / 全马 3:03",
      pace: "全马预计完赛：--:--:--",
      loading: "状态：完美装载（3天高碳水方案）",
      gelCount: "6 根补给，赛中总碳水约 150g",
      ambientTemp: "12°C 附近通常更利于长距离发挥",
      gelCarb: "常见能量胶约 20-30g/支，可按品牌调整",
      maxAbsorb: "大众档：稳妥安全线（约60g/h）",
    },
  },

  onLoad() {
    this.seriesCache = [];
    this.runSimulation({ keepSelection: false });
  },

  onReady() {
    this.measureChartAndDraw();
  },

  onSliderChange(event) {
    const key = event.currentTarget.dataset.key;
    const value = normalizeFuelerSliderValue(key, event.detail.value);
    if (value === null) return;

    this.setData(
      {
        [`form.${key}`]: value,
      },
      () => this.runSimulation({ keepSelection: true })
    );
  },

  onTapGel(event) {
    const km = Number(event.currentTarget.dataset.km);
    if (!Number.isFinite(km)) return;

    this.setData({ selectedGelKm: km }, () => {
      this.refreshCheckpointFocus();
      this.drawCurves();
    });
  },

  runSimulation(options = {}) {
    const nextState = buildFuelerSimulationState(this.data.form, this.data.selectedGelKm, options);
    this.seriesCache = nextState.series;

    this.setData(nextState.data, () => this.drawCurves());
  },

  refreshCheckpointFocus() {
    const checkpointState = buildFuelerCheckpointState(
      this.seriesCache || [],
      this.data.summary,
      this.data.selectedGelKm
    );
    this.setData(checkpointState);
  },

  measureChartAndDraw() {
    const query = wx.createSelectorQuery().in(this);
    query
      .select("#glyChartWrap")
      .boundingClientRect()
      .select("#rearChartWrap")
      .boundingClientRect()
      .exec((res) => {
        const mainRect = res && res[0];
        const rearRect = res && res[1];
        const nextData = {};

        if (mainRect && mainRect.width) {
          nextData.chartWidth = Math.max(320, Math.floor(mainRect.width));
        }
        if (rearRect && rearRect.width) {
          nextData.rearChartWidth = Math.max(320, Math.floor(rearRect.width));
        }

        if (Object.keys(nextData).length === 0) {
          this.drawCurves();
          return;
        }

        this.setData(nextData, () => this.drawCurves());
      });
  },

  drawCurves() {
    this.drawMainCurve();
    this.drawRearCurve();
  },

  drawMainCurve() {
    drawMainFuelerCurve(this, {
      series: this.seriesCache || [],
      width: this.data.chartWidth || 640,
      height: this.data.chartHeight || 220,
      selectedGelKm: this.data.selectedGelKm,
      gelPoints: this.data.summary.gelPoints || [],
    });
  },

  drawRearCurve() {
    drawRearFuelerCurve(this, {
      series: this.seriesCache || [],
      width: this.data.rearChartWidth || this.data.chartWidth || 640,
      height: this.data.rearChartHeight || 220,
    });
  },
});
