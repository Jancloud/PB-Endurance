const planService = require("../../services/plan");
const raceService = require("../../services/race");
const { createHomeWeatherController } = require("../../services/home_weather");
const { buildHomeViewModel } = require("../../utils/home_view");
const { syncTabBarSelected } = require("../../utils/tabbar");

function findCurrentWeek(planConfig, todayTask) {
  if (!planConfig || !planConfig.templateName || !todayTask || !todayTask.week) {
    return null;
  }
  const weeks = planService.getWeeksWithStatus(planConfig.templateName, planConfig.startDate);
  return weeks.find((week) => Number(week.week) === Number(todayTask.week)) || null;
}

Page({
  data: {
    heroMainText: "--",
    heroSubText: "请先在计划页选择训练计划",
    heroWeekText: "--",
    heroDoneText: "--",
    progressBarWidth: "0%",
    targetRaceMetricText: "未设置",
    targetRaces: [],
    hasTargetRaces: false,
    hasRaceHint: false,
    raceHintText: "",
    raceHintName: "",
    raceHintSubtitle: "",
    raceHintDateText: "",
    raceHintDaysText: "--",
    todayTask: null,
    hasTodaySession: false,
    hasTodayMessage: false,
    todaySessionTypeText: "",
    todaySessionDescText: "",
    todayDistanceText: "--",
    todayDistanceNumber: "--",
    todayDistanceUnit: "",
    todayPaceText: "--",
    todayCompleted: false,
    todayCheckinButtonText: "完成打卡",
    hasWeekOverview: false,
    weekOverview: null,
    weather: null,
    weatherRiskTagText: "天气加载中",
    weatherSourceText: "正在获取天气数据...",
    showTaperReminder: false,
    taperReminderText: "",
    taperReminderRaceName: "",
  },

  onLoad() {
    this.weatherController = createHomeWeatherController({
      onUpdate: (viewData) => {
        this.setData(viewData);
      },
    });
  },

  onShow() {
    syncTabBarSelected(this, 0);
    this.refreshData();
    if (this.weatherController) {
      this.weatherController.start();
      this.weatherController.refresh();
    }
  },

  onHide() {
    if (this.weatherController) {
      this.weatherController.stop();
    }
  },

  onUnload() {
    if (this.weatherController) {
      this.weatherController.stop();
    }
  },

  refreshData() {
    const todayTask = planService.getTodayTask();
    const targetRaces = raceService.listTargetRaces();
    const planConfig = planService.getUserPlanConfig();
    const completion =
      planConfig && planConfig.templateName
        ? planService.getCompletionStats(planConfig.templateName, planConfig.startDate)
        : null;
    const currentWeek = findCurrentWeek(planConfig, todayTask);

    const heroMainText = completion ? `${completion.percent}%` : "--";
    const progressBarWidth = completion ? `${Math.max(0, Math.min(100, Number(completion.percent) || 0))}%` : "0%";
    const heroSubText = planConfig ? `当前计划 ${planConfig.templateName}` : "请先在计划页选择训练计划";
    const heroWeekText = todayTask && todayTask.week ? `第${todayTask.week}周` : "未开练";
    const heroDoneText = completion ? `${completion.completed}/${completion.total}` : "--";

    this.setData(
      Object.assign({}, buildHomeViewModel(todayTask, targetRaces, currentWeek), {
        heroMainText,
        progressBarWidth,
        heroSubText,
        heroWeekText,
        heroDoneText,
        weatherSourceText: "正在获取当前城市天气...",
        weatherRiskTagText: "天气加载中",
      })
    );
  },

  toggleTodayTask() {
    const todayTask = this.data.todayTask;
    if (!todayTask || !todayTask.week || !todayTask.dayIndex) {
      return;
    }

    const result = planService.toggleCompleted(todayTask.week, todayTask.dayIndex);
    if (!result || !result.ok) {
      if (result && result.reason === "FUTURE_SESSION") {
        wx.showToast({
          title: "未到训练日，暂不能打卡",
          icon: "none",
        });
      }
      return;
    }
    this.refreshData();
  },

  goToFueler() {
    wx.navigateTo({
      url: "/pages/fueler/index",
    });
  },

  goToPlan() {
    wx.switchTab({
      url: "/pages/plan/index",
    });
  },

  goToRace() {
    wx.switchTab({
      url: "/pages/race/index",
    });
  },

  goToTaperGuide() {
    wx.switchTab({
      url: "/pages/plan/index",
    });
  },

  onShareAppMessage() {
    return {
      title: "PB日历 - 马拉松备赛助手",
      path: "/pages/home/index",
    };
  },

  onShareTimeline() {
    return {
      title: "PB日历 - 马拉松备赛助手",
    };
  },
});
