const KEYS = {
  USER_PLAN: "user_plan",
  PLAN_PROGRESS: "plan_progress",
  TARGET_RACE_ID: "target_race_id",
  TARGET_RACE_IDS: "target_race_ids",
  RUNS: "runs",
};

function get(key, fallback = null) {
  try {
    const value = wx.getStorageSync(key);
    return value === "" || value === undefined ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function set(key, value) {
  wx.setStorageSync(key, value);
}

function remove(key) {
  wx.removeStorageSync(key);
}

function clearAllAppData() {
  Object.values(KEYS).forEach((key) => remove(key));
}

module.exports = {
  KEYS,
  get,
  set,
  remove,
  clearAllAppData,
};
