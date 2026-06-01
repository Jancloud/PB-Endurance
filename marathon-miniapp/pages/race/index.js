const { syncTabBarSelected } = require("../../utils/tabbar");
﻿const raceService = require("../../services/race");
const { buildRaceViewModel } = require("../../utils/race_view");

Page({
  data: {
    allRaces: [],
    targetRaces: [],
    totalMatchedCount: 0,
    unverifiedCount: 0,
    officialMissingSourceCount: 0,
    withSourceCount: 0,

    months: [],
    activeMonth: "",
    activeMonthLabel: "",
    filteredRaces: [],
    calendarCells: [],
    showCalendar: false,
    weekLabels: ["一", "二", "三", "四", "五", "六", "日"],

    keyword: "",
    distanceOptions: ["全部"],
    statusOptions: ["全部"],
    cityOptions: ["全部"],
    levelOptions: ["全部"],
    dateStatusOptions: ["全部"],

    selectedDistance: "全部",
    selectedStatus: "全部",
    selectedCity: "全部",
    selectedLevel: "全部",
    selectedDateStatus: "全部",

    distanceIndex: 0,
    statusIndex: 0,
    cityIndex: 0,
    levelIndex: 0,
    dateStatusIndex: 0,
  },

  onShow() {
    syncTabBarSelected(this, 2);
    this.loadData();
  },

  loadData() {
    this.setData(buildRaceViewModel(raceService, this.data));
  },

  onKeywordInput(event) {
    this.setData(
      {
        keyword: (event.detail.value || "").trim(),
      },
      () => this.loadData()
    );
  },

  onDistanceChange(event) {
    const index = Number(event.detail.value || 0);
    const value = this.data.distanceOptions[index] || "全部";
    this.setData(
      {
        distanceIndex: index,
        selectedDistance: value,
      },
      () => this.loadData()
    );
  },

  onStatusChange(event) {
    const index = Number(event.detail.value || 0);
    const value = this.data.statusOptions[index] || "全部";
    this.setData(
      {
        statusIndex: index,
        selectedStatus: value,
      },
      () => this.loadData()
    );
  },

  onCityChange(event) {
    const index = Number(event.detail.value || 0);
    const value = this.data.cityOptions[index] || "全部";
    this.setData(
      {
        cityIndex: index,
        selectedCity: value,
      },
      () => this.loadData()
    );
  },

  onLevelChange(event) {
    const index = Number(event.detail.value || 0);
    const value = this.data.levelOptions[index] || "全部";
    this.setData(
      {
        levelIndex: index,
        selectedLevel: value,
      },
      () => this.loadData()
    );
  },

  onDateStatusChange(event) {
    const index = Number(event.detail.value || 0);
    const value = this.data.dateStatusOptions[index] || "全部";
    this.setData(
      {
        dateStatusIndex: index,
        selectedDateStatus: value,
      },
      () => this.loadData()
    );
  },

  onResetFilters() {
    this.setData(
      {
        keyword: "",
        selectedDistance: "全部",
        selectedStatus: "全部",
        selectedCity: "全部",
        selectedLevel: "全部",
        selectedDateStatus: "全部",
        distanceIndex: 0,
        statusIndex: 0,
        cityIndex: 0,
        levelIndex: 0,
        dateStatusIndex: 0,
      },
      () => this.loadData()
    );
  },

  onMonthTap(event) {
    const month = event.currentTarget.dataset.month;
    this.setData(
      {
        activeMonth: month,
      },
      () => this.loadData()
    );
  },

  toggleTarget(event) {
    const id = event.currentTarget.dataset.id;
    const added = raceService.toggleTargetRace(id);
    this.loadData();
    wx.showToast({
      title: added ? "已加入目标赛事" : "已移除目标赛事",
      icon: "none",
    });
  },

  removeTarget(event) {
    const id = event.currentTarget.dataset.id;
    raceService.removeTargetRace(id);
    this.loadData();
    wx.showToast({
      title: "已移除目标赛事",
      icon: "none",
    });
  },

  onShareAppMessage() {
    return {
      title: "PB日历 - 马拉松赛事日历",
      path: "/pages/race/index",
    };
  },

  onShareTimeline() {
    return {
      title: "PB日历 - 马拉松赛事日历",
    };
  },
});
