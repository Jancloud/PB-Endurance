function normalizeCityName(name) {
  return String(name || "").trim();
}

function parseWindPower(value) {
  const raw = String(value || "");
  const numbers = raw.match(/\d+/g);
  if (!numbers || numbers.length === 0) {
    return 0;
  }
  const values = numbers.map((item) => Number(item)).filter((n) => Number.isFinite(n));
  if (values.length === 0) {
    return 0;
  }
  return Math.max.apply(null, values);
}

function calculateDewPoint(temperature, humidity) {
  const temperatureValue = Number(temperature);
  const humidityValue = Number(humidity);
  if (!Number.isFinite(temperatureValue) || !Number.isFinite(humidityValue) || humidityValue <= 0) {
    return null;
  }

  const normalizedHumidity = Math.min(100, humidityValue) / 100;
  const magnusA = 17.62;
  const magnusB = 243.12;
  const gamma = Math.log(normalizedHumidity) + (magnusA * temperatureValue) / (magnusB + temperatureValue);
  return Math.round((magnusB * gamma) / (magnusA - gamma));
}

function resolveWeatherIcon(text) {
  const weatherText = String(text || "");
  if (/雷/.test(weatherText)) return "⛈️";
  if (/雪|冰雹/.test(weatherText)) return "🌨️";
  if (/雨/.test(weatherText)) return "🌧️";
  if (/沙尘|浮尘/.test(weatherText)) return "🌪️";
  if (/晴/.test(weatherText)) return "☀️";
  if (/多云|阴/.test(weatherText)) return "⛅";
  return "🌥️";
}

function buildAdvice(live) {
  const temperature = Number(live.temperature || 0);
  const humidity = Number(live.humidity || 0);
  const windPower = parseWindPower(live.windpower);
  const weatherText = String(live.weather || "");

  const isThunder = /雷/.test(weatherText);
  const isSnow = /雪|冰雹/.test(weatherText);
  const isRain = /雨/.test(weatherText);
  const isDust = /沙尘|浮尘/.test(weatherText);
  const isHot = temperature >= 31;
  const isVeryHot = temperature >= 34;
  const isHumidHeatHigh = humidity >= 85 && temperature >= 30;
  const isHumidHeatMedium = humidity >= 78 && temperature >= 27;
  const isCold = temperature <= 3;
  const isVeryCold = temperature <= -1;
  const isWindy = windPower >= 6;

  if (isThunder) {
    return { riskLevel: "high", riskTag: "雷雨预警", tip: "有雷雨风险，建议改为室内训练，避免空旷区域。" };
  }
  if (isVeryHot || isHumidHeatHigh) {
    return {
      riskLevel: "high",
      riskTag: "高温闷热预警",
      tip: "高温叠加高湿，体感负担明显上升，建议降低强度、缩短时长并及时补水补电解质。",
    };
  }
  if (isHot || isHumidHeatMedium) {
    return {
      riskLevel: "medium",
      riskTag: "闷热提醒",
      tip: "湿度较高会放大跑步体感负担，建议控制强度，优先选择清晨或夜间时段。",
    };
  }
  if (isVeryCold) {
    return { riskLevel: "high", riskTag: "低温提醒", tip: "天气寒冷，建议延长热身并做好防风保暖。" };
  }
  if (isCold) {
    return { riskLevel: "medium", riskTag: "低温注意", tip: "天气偏冷，建议穿分层速干衣物，训练后及时更换。" };
  }
  if (isSnow) {
    return { riskLevel: "high", riskTag: "雨雪提醒", tip: "路面湿滑，建议降低配速并减少急停急转。" };
  }
  if (isRain) {
    return { riskLevel: "medium", riskTag: "雨天提醒", tip: "有降水风险，户外运动请注意防滑，必要时改为室内训练。" };
  }
  if (isDust) {
    return { riskLevel: "medium", riskTag: "空气提醒", tip: "空气条件一般，建议选择低车流路线并关注体感。" };
  }
  if (isWindy) {
    return { riskLevel: "medium", riskTag: "大风提醒", tip: "风力较大，建议选择避风路线并关注体感强度。" };
  }
  return { riskLevel: "low", riskTag: "适宜跑步", tip: "天气条件不错，适合户外跑步，注意按计划控速。" };
}

function normalizeWeatherPayload(live, city) {
  const advice = buildAdvice(live || {});
  const weatherText = String((live && live.weather) || "未知");
  const temperature = Math.round(Number((live && live.temperature) || 0));
  const humidity = Math.round(Number((live && live.humidity) || 0));
  const dewPoint = calculateDewPoint(temperature, humidity);
  const windSpeed = parseWindPower(live && live.windpower);
  return {
    city: normalizeCityName(city) || "当前位置",
    temperature,
    apparentTemperature: temperature,
    humidity,
    dewPoint,
    weatherText,
    weatherIcon: resolveWeatherIcon(weatherText),
    windSpeed,
    precipitation: 0,
    riskLevel: advice.riskLevel,
    riskTag: advice.riskTag,
    tip: advice.tip,
    source: "高德天气",
  };
}

module.exports = {
  calculateDewPoint,
  normalizeWeatherPayload,
};
