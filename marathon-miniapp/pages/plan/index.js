const { syncTabBarSelected } = require("../../utils/tabbar");
const planService = require("../../services/plan");
const { buildPlanViewModel } = require("../../utils/plan_view");
const { formatDate } = require("../../utils/date");

function formatTargetTime(totalMinutes) {
  const minutes = Number(totalMinutes);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "--";
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = `${minutes % 60}`.padStart(2, "0");
  return `${hours}:${remainingMinutes}`;
}

function resolveMonday(dateString) {
  const current = new Date(`${dateString}T00:00:00`);
  const weekday = current.getDay();
  const daysToMonday = weekday === 0 ? 1 : 8 - weekday;
  if (weekday !== 1) {
    current.setDate(current.getDate() + daysToMonday);
  }
  return formatDate(current);
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
    activeMonthlyVolume: "",
    activeAudience: "",
    activeTestNote: "",
    isSummerPlan: false,
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
      }));

    this.setData({
      ...viewData,
      planEventFilter,
      planCycleFilter,
      visibleTemplates,
    });
  },

  onPlanEventChange(event) {
    this.loadPlanData(this.data.activeWeek, {
      event: event.currentTarget.dataset.value,
    });
  },

  onPlanCycleChange(event) {
    this.loadPlanData(this.data.activeWeek, {
      cycle: event.currentTarget.dataset.value,
    });
  },

  onTemplateSelect(event) {
    const template = this.data.templates.find((item) => item.name === event.currentTarget.dataset.name);
    if (!template) {
      return;
    }
    const startDate = template.cycle === "夏训专项" ? resolveMonday(this.data.startDate) : this.data.startDate;
    planService.setUserPlanConfig(template.name, startDate);
    this.loadPlanData(undefined, {
      event: template.event,
      cycle: template.cycle,
    });
  },

  onStartDateChange(event) {
    const pickedDate = event.detail.value;
    const today = this.data.minStartDate;
    let startDate = pickedDate < today ? today : pickedDate;
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
    if (template.cycle === "夏训专项") {
      const mondayStartDate = resolveMonday(startDate);
      if (mondayStartDate !== startDate) {
        wx.showToast({
          title: "夏训计划从下一个周一开练",
          icon: "none",
        });
      }
      startDate = mondayStartDate;
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

  showSafetyGuide() {
    wx.showModal({
      title: "选课与参赛安全建议",
      content:
        "半马更偏向“耐力基础上的速度能力”，全马更考验长期有氧底盘和恢复能力。全马训练负荷较高，建议具备 1 年以上规律跑步基础，且最近 3 个月月跑量稳定在 150km 以上后再参赛。若近期伤病、睡眠差或心率异常，请优先降低目标或咨询专业人士。",
      confirmText: "知道了",
      showCancel: false,
    });
  },

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
