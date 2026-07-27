const { EVENT_OPTIONS, calculateVdotResult } = require("../../utils/vdot");

Page({
  data: {
    eventOptions: EVENT_OPTIONS.map((event) => event.label),
    eventIndex: 1,
    finishTime: "",
    result: null,
    errorText: "",
  },

  onEventChange(event) {
    this.setData({ eventIndex: Number(event.detail.value || 0), errorText: "" });
  },

  onFinishTimeInput(event) {
    this.setData({ finishTime: event.detail.value || "", errorText: "" });
  },

  onCalculate() {
    const result = calculateVdotResult(this.data.eventIndex, this.data.finishTime);
    if (!result) {
      this.setData({
        result: null,
        errorText: "请输入有效完赛时间，例如 40:00 或 1:32:40。",
      });
      return;
    }

    this.setData({ result, errorText: "" });
  },
});
