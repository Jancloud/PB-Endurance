const appInfo = require("../../config/app-info");

Page({
  data: {
    appName: appInfo.appName || "PB日历",
    developer: appInfo.developer || "Jan",
    version: appInfo.version || "V1.1",
    releaseDate: appInfo.releaseDate || "2026-05-20",
  },
});
