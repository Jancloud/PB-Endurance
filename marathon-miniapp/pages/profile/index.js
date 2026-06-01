const { clearAllAppData } = require("../../utils/storage");
const { syncTabBarSelected } = require("../../utils/tabbar");
const { buildProfileViewModel } = require("../../utils/profile_view");

Page({
  data: {
    planName: "未设置",
    planStartDate: "--",
    completionText: "--",
    completedDaysText: "--",
    targetRaceCountText: "0场",
  },

  onShow() {
    syncTabBarSelected(this, 3);
    this.refreshProfileData();
  },

  refreshProfileData() {
    this.setData(buildProfileViewModel());
  },

  goToAbout() {
    wx.navigateTo({
      url: "/pages/about/index",
    });
  },

  resetAll() {
    wx.showModal({
      title: "确认重置全部数据？",
      content: "这会清空训练计划进度和目标赛事；不会影响小程序代码或你的微信账号。",
      confirmText: "确认重置",
      confirmColor: "#ff4b4b",
      cancelText: "取消",
      success: (res) => {
        if (res.confirm) {
          clearAllAppData();
          this.refreshProfileData();
        }
      },
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
