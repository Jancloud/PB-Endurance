function request(url, data, timeout = 8000) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      data,
      timeout,
      success: (res) => {
        if (res && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        reject(new Error(`HTTP_${(res && res.statusCode) || "UNKNOWN"}`));
      },
      fail: (err) => {
        const errMsg = String((err && err.errMsg) || "REQUEST_FAILED");
        reject(new Error(errMsg));
      },
    });
  });
}

function requestWithRetry(url, data, timeout = 8000) {
  return request(url, data, timeout).catch((error) => {
    const errMsg = String((error && error.message) || "").toLowerCase();
    if (!errMsg.includes("timeout")) {
      throw error;
    }
    return request(url, data, timeout + 3000);
  });
}

function ensureAmapSuccess(data, scene) {
  if (!data || String(data.status) !== "1") {
    const info = data && (data.info || data.infocode || "UNKNOWN");
    throw new Error(`AMAP_${scene}_FAILED_${info}`);
  }
}

function fetchCityAndAdcode(apiKey, latitude, longitude) {
  return requestWithRetry(
    "https://restapi.amap.com/v3/geocode/regeo",
    {
      key: apiKey,
      location: `${longitude},${latitude}`,
      extensions: "base",
      output: "JSON",
      roadlevel: 0,
      radius: 1000,
    },
    8000
  ).then((data) => {
    ensureAmapSuccess(data, "REGEO");
    const comp = (data && data.regeocode && data.regeocode.addressComponent) || {};
    const cityField = comp.city;
    const cityFromField = Array.isArray(cityField) ? cityField[0] : cityField;
    const city = cityFromField || comp.district || comp.province || "";
    const adcode = String(comp.adcode || "").trim();
    if (!adcode) {
      throw new Error("AMAP_REGEO_NO_ADCODE");
    }
    return {
      city: String(city || "").trim(),
      adcode,
    };
  });
}

function fetchLiveWeather(apiKey, adcode) {
  return requestWithRetry(
    "https://restapi.amap.com/v3/weather/weatherInfo",
    {
      key: apiKey,
      city: adcode,
      extensions: "base",
      output: "JSON",
    },
    8000
  ).then((data) => {
    ensureAmapSuccess(data, "WEATHER");
    const lives = (data && data.lives) || [];
    const live = lives[0];
    if (!live) {
      throw new Error("AMAP_WEATHER_EMPTY");
    }
    return live;
  });
}

module.exports = {
  fetchCityAndAdcode,
  fetchLiveWeather,
};
