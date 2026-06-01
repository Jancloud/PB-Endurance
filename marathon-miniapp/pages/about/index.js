const appInfo = require("../../config/app-info");

Page({
  data: {
    appName: appInfo.appName || "PB日历",
    developer: appInfo.developer || "Jan",
    version: appInfo.version || "V2.0",
    releaseDate: appInfo.releaseDate || "2026-06-01",
  },
});
