const weatherService = require("./weather");
const locationService = require("./location");

const LOCATION_TIMEOUT_COOLDOWN_MS = 10 * 60 * 1000;
const WEATHER_REFRESH_MS = 3 * 60 * 1000;

function resolveWeatherSourceText(error, hasLocation) {
  const errMsg = String((error && error.message) || "");
  if (!hasLocation) return "定位失败，显示示例天气";
  if (errMsg.includes("AMAP_KEY_MISSING")) return "天气服务未配置高德 Key";
  if (errMsg.includes("INVALID_USER_KEY")) return "高德 Key 无效，请检查配置";
  if (errMsg.includes("USERKEY_PLAT_NOMATCH")) return "高德 Key 平台不匹配，请使用 Web 服务 Key";
  if (errMsg.includes("DAILY_QUERY_OVER_LIMIT")) return "高德天气接口今日配额已用完";
  if (errMsg.includes("HTTP_403")) return "天气接口 403，请检查高德 Key 权限";
  if (errMsg.toLowerCase().includes("timeout")) return "天气服务超时，显示示例天气";
  return "天气服务异常，显示示例天气";
}

function buildWeatherViewData(weather, sourceText) {
  return {
    weather,
    weatherRiskTagText: weather.riskTag || "天气提醒",
    weatherSourceText: sourceText || weather.source || "实时天气",
  };
}

function buildFallbackWeatherViewData(error, hasLocation) {
  const fallbackWeather = weatherService.getFallbackWeather();
  const city = hasLocation ? "当前位置" : "定位失败";
  const weather = Object.assign({}, fallbackWeather, { city });

  return {
    weather,
    weatherRiskTagText: fallbackWeather.riskTag || "离线天气",
    weatherSourceText: resolveWeatherSourceText(error, hasLocation),
  };
}

function requestCurrentLocation(controller) {
  return new Promise((resolve) => {
    const tryGetLocation = (timeoutMs, retryLeft) => {
      wx.getLocation({
        type: "gcj02",
        isHighAccuracy: true,
        highAccuracyExpireTime: timeoutMs,
        timeout: timeoutMs,
        success: (res) => {
          controller.locationTimeoutBackoffUntil = 0;
          const location = {
            latitude: res.latitude,
            longitude: res.longitude,
          };
          controller.lastSuccessLocation = location;
          locationService.saveLastWeatherLocation(location);
          resolve(location);
        },
        fail: (err) => {
          const errMsg = String((err && err.errMsg) || "");
          console.error("getLocation fail:", err);

          if (
            !controller.locationAuthPrompted &&
            (errMsg.includes("auth deny") || errMsg.includes("auth denied") || errMsg.includes("authorize"))
          ) {
            controller.locationAuthPrompted = true;
            wx.showModal({
              title: "需要定位权限",
              content: "开启定位后，天气会自动切换为你所在城市。",
              confirmText: "去开启",
              success: (modalRes) => {
                if (!modalRes.confirm) {
                  resolve(null);
                  return;
                }
                wx.openSetting({
                  success: (settingRes) => {
                    if (settingRes.authSetting && settingRes.authSetting["scope.userLocation"]) {
                      controller.refresh();
                      resolve(null);
                      return;
                    }
                    resolve(null);
                  },
                  fail: () => resolve(null),
                });
              },
            });
            return;
          }

          if (retryLeft > 0 && errMsg.toLowerCase().includes("timeout")) {
            tryGetLocation(timeoutMs + 3000, retryLeft - 1);
            return;
          }

          if (errMsg.toLowerCase().includes("timeout")) {
            controller.locationTimeoutBackoffUntil = Date.now() + LOCATION_TIMEOUT_COOLDOWN_MS;
          }
          resolve(null);
        },
      });
    };

    tryGetLocation(9000, 1);
  });
}

function createHomeWeatherController(options) {
  const onUpdate = options && options.onUpdate;
  const onError = options && options.onError;

  const controller = {
    timer: null,
    lastSuccessLocation: locationService.loadLastWeatherLocation(),
    locationTimeoutBackoffUntil: 0,
    locationAuthPrompted: false,

    start() {
      this.stop();
      this.timer = setInterval(() => this.refresh(), WEATHER_REFRESH_MS);
    },

    stop() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },

    refresh() {
      if (this.locationTimeoutBackoffUntil && Date.now() < this.locationTimeoutBackoffUntil && this.lastSuccessLocation) {
        return this.fetchByLocation(this.lastSuccessLocation, "实时天气（最近位置）", true);
      }

      let hasLocationThisRound = false;
      return requestCurrentLocation(this)
        .then((location) => {
          if (location) {
            hasLocationThisRound = true;
            return weatherService.fetchWeather(location);
          }
          if (this.lastSuccessLocation) {
            hasLocationThisRound = true;
            return weatherService.fetchWeather(this.lastSuccessLocation).then((weather) =>
              Object.assign({}, weather, {
                city: weather.city || "最近位置",
                source: "实时天气（最近位置）",
              })
            );
          }
          return Promise.reject(new Error("NO_LOCATION"));
        })
        .then((weather) => {
          if (typeof onUpdate === "function") {
            onUpdate(buildWeatherViewData(weather, weather.source || "实时天气"));
          }
        })
        .catch((error) => {
          console.error("weather fetch fail:", error);
          if (typeof onError === "function") onError(error);
          if (typeof onUpdate === "function") {
            onUpdate(buildFallbackWeatherViewData(error, hasLocationThisRound));
          }
        });
    },

    fetchByLocation(location, sourceText, hasLocation) {
      return weatherService
        .fetchWeather(location)
        .then((weather) => {
          if (typeof onUpdate === "function") {
            onUpdate(buildWeatherViewData(weather, sourceText));
          }
        })
        .catch((error) => {
          console.error("weather fetch fail (cached location):", error);
          if (typeof onError === "function") onError(error);
          if (typeof onUpdate === "function") {
            onUpdate(buildFallbackWeatherViewData(error, hasLocation));
          }
        });
    },
  };

  return controller;
}

module.exports = {
  createHomeWeatherController,
  buildFallbackWeatherViewData,
  buildWeatherViewData,
  resolveWeatherSourceText,
};
