const { syncTabBarSelected } = require("../../utils/tabbar");
const planService = require("../../services/plan");
const { buildPlanViewModel } = require("../../utils/plan_view");

function formatTargetTime(totalMinutes) {
  const minutes = Number(totalMinutes);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "--";
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = `${minutes % 60}`.padStart(2, "0");
  return `${hours}:${remainingMinutes}`;
}

Page({
  data: {
    templates: [],
    templateIndex: 0,
    visibleTemplates: [],
    planEventOptions: ["全马", "半马"],
    planCycleOptions: ["常规备赛", "夏训专项"],
    planEventFilter: "",
    planCycleFilter: "",
    startDate: "",
    minStartDate: "",
    weeks: [],
    activeWeek: 1,
    completion: null,
    completionBarWidth: "0%",
    completionPercentText: "0%",
    activeTemplateName: "",
    activePlanEvent: "",
    activePlanCycle: "",
    activeTargetPace: "--",
    activePlanSummary: "",
    isSummerPlan: false,
    expandedSummerPlanName: "",
    weekCountText: "0周",
    doneCountText: "0次",
    totalDistanceText: "0km",
    weekCountNumber: "0",
    weekCountUnit: "周",
    doneCountNumber: "0",
    doneCountUnit: "次",
    totalDistanceNumber: "0",
    totalDistanceUnit: "km",
    distanceMetricLabel: "总公里",
    taperGuideVisible: false,
  },

  onShow() {
    syncTabBarSelected(this, 1);
    this.loadPlanData();
  },

  loadPlanData(activeWeekOverride, filters = {}) {
    const viewData = buildPlanViewModel(planService, activeWeekOverride);
    const selectedTemplate = viewData.templates[viewData.templateIndex];
    const planEventFilter = filters.event || this.data.planEventFilter || (selectedTemplate && selectedTemplate.event) || "全马";
    const planCycleFilter = filters.cycle || this.data.planCycleFilter || (selectedTemplate && selectedTemplate.cycle) || "常规备赛";
    const visibleTemplates = viewData.templates
      .filter((template) => template.event === planEventFilter && template.cycle === planCycleFilter)
      .sort((left, right) => left.targetTimeMinutes - right.targetTimeMinutes)
      .map((template) => ({
        ...template,
        targetTimeText: formatTargetTime(template.targetTimeMinutes),
        targetPaceText: template.targetPace || "--",
        displayName: template.displayName || template.name,
        cycleText: `${template.cycle} · ${template.weeksCount}周`,
        isSummerPlan: template.cycle === "夏训专项",
        monthlyVolumeText: (template.monthlyVolume || []).join("／"),
      }));

    this.setData({
      ...viewData,
      planEventFilter,
      planCycleFilter,
      visibleTemplates,
    });
  },

  onPlanEventChange(event) {
    this.setData({ expandedSummerPlanName: "" });
    this.loadPlanData(this.data.activeWeek, {
      event: event.currentTarget.dataset.value,
    });
  },

  onPlanCycleChange(event) {
    this.setData({ expandedSummerPlanName: "" });
    this.loadPlanData(this.data.activeWeek, {
      cycle: event.currentTarget.dataset.value,
    });
  },

  onTemplateSelect(event) {
    const template = this.data.templates.find((item) => item.name === event.currentTarget.dataset.name);
    if (!template) {
      return;
    }
    this.setData({ expandedSummerPlanName: "" });
    planService.setUserPlanConfig(template.name, this.data.startDate);
    this.loadPlanData(undefined, {
      event: template.event,
      cycle: template.cycle,
    });
  },

  onStartDateChange(event) {
    const pickedDate = event.detail.value;
    const today = this.data.minStartDate;
    const startDate = pickedDate < today ? today : pickedDate;
    const template = this.data.templates[this.data.templateIndex];
    if (!template) {
      return;
    }
    if (pickedDate < today) {
      wx.showToast({
        title: "起始日期不能早于今天",
        icon: "none",
      });
    }
    planService.setUserPlanConfig(template.name, startDate);
    this.loadPlanData();
  },

  toggleWeek(event) {
    const week = Number(event.currentTarget.dataset.week);
    this.setData({
      activeWeek: this.data.activeWeek === week ? 0 : week,
    });
  },

  toggleSession(event) {
    const week = Number(event.currentTarget.dataset.week);
    const dayIndex = Number(event.currentTarget.dataset.dayindex);
    const result = planService.toggleCompleted(week, dayIndex);
    if (!result || !result.ok) {
      if (result && result.reason === "FUTURE_SESSION") {
        wx.showToast({
          title: "未到训练日期，暂不能打卡",
          icon: "none",
        });
      }
      return;
    }
    this.loadPlanData(this.data.activeWeek);
  },

  toggleTaperGuide() {
    this.setData({
      taperGuideVisible: !this.data.taperGuideVisible,
    });
  },

  toggleSummerPlanInfo(event) {
    const templateName = event.currentTarget.dataset.name;
    this.setData({
      expandedSummerPlanName: this.data.expandedSummerPlanName === templateName ? "" : templateName,
    });
  },

  stopPlanInfoTap() {},

  goToFueler() {
    wx.navigateTo({
      url: "/pages/fueler/index",
    });
  },

  onShareAppMessage() {
    return {
      title: "PB日历 - 马拉松备赛训练计划",
      path: "/pages/plan/index",
    };
  },

  onShareTimeline() {
    return {
      title: "PB日历 - 马拉松备赛训练计划",
    };
  },
});
