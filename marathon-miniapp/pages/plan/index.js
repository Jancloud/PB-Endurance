const { syncTabBarSelected } = require("../../utils/tabbar");
const planService = require("../../services/plan");
const { buildPlanViewModel } = require("../../utils/plan_view");

Page({
  data: {
    templates: [],
    templateNames: [],
    templateIndex: 0,
    startDate: "",
    minStartDate: "",
    weeks: [],
    activeWeek: 1,
    completion: null,
    completionBarWidth: "0%",
    activeTemplateName: "",
    weekCountText: "0周",
    doneCountText: "0次",
    totalDistanceText: "0km",
    taperGuideVisible: true,
  },

  onShow() {
    syncTabBarSelected(this, 1);
    this.loadPlanData();
  },

  loadPlanData(activeWeekOverride) {
    this.setData(buildPlanViewModel(planService, activeWeekOverride));
  },

  onTemplateChange(event) {
    const templateIndex = Number(event.detail.value);
    const template = this.data.templates[templateIndex];
    if (!template) {
      return;
    }
    planService.setUserPlanConfig(template.name, this.data.startDate);
    this.loadPlanData();
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
