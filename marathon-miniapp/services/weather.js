const weatherProvider = require("../config/weather-provider");
const { readCachedGeo, writeCachedGeo } = require("./weather_cache");
const { fetchCityAndAdcode, fetchLiveWeather } = require("./weather_client");
const { normalizeWeatherPayload } = require("./weather_normalizer");

const AMAP_KEY = String((weatherProvider && weatherProvider.amapKey) || "").trim();

function fetchByGeo(geo) {
  return fetchLiveWeather(AMAP_KEY, geo.adcode).then((live) => normalizeWeatherPayload(live, geo.city));
}

function refreshGeoAndWeather(latitude, longitude) {
  return fetchCityAndAdcode(AMAP_KEY, latitude, longitude).then((geo) => {
    writeCachedGeo(geo);
    return fetchByGeo(geo);
  });
}

function fetchWeather(location) {
  if (!location || !location.latitude || !location.longitude) {
    return Promise.reject(new Error("NO_LOCATION"));
  }
  if (!AMAP_KEY) {
    return Promise.reject(new Error("AMAP_KEY_MISSING"));
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  const cachedGeo = readCachedGeo();
  if (cachedGeo && cachedGeo.adcode) {
    return fetchByGeo(cachedGeo).catch(() => refreshGeoAndWeather(latitude, longitude));
  }

  return refreshGeoAndWeather(latitude, longitude);
}

function getFallbackWeather() {
  return {
    city: "当前位置",
    temperature: 30,
    apparentTemperature: 32,
    humidity: 70,
    dewPoint: 24,
    weatherText: "多云",
    weatherIcon: "🌥️",
    windSpeed: 2,
    precipitation: 0,
    riskLevel: "medium",
    riskTag: "天气加载中",
    tip: "天气数据暂不可用，请稍后刷新重试。",
    source: "离线天气",
  };
}

module.exports = {
  fetchWeather,
  getFallbackWeather,
};
