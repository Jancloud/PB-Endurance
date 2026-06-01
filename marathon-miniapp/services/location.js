const LAST_WEATHER_LOCATION_KEY = "last_weather_location";

function loadLastWeatherLocation() {
  try {
    const value = wx.getStorageSync(LAST_WEATHER_LOCATION_KEY);
    if (!value || !value.latitude || !value.longitude) {
      return null;
    }
    return {
      latitude: Number(value.latitude),
      longitude: Number(value.longitude),
    };
  } catch (error) {
    return null;
  }
}

function saveLastWeatherLocation(location) {
  try {
    wx.setStorageSync(LAST_WEATHER_LOCATION_KEY, location);
  } catch (error) {
    // ignore storage error
  }
}

module.exports = {
  loadLastWeatherLocation,
  saveLastWeatherLocation,
};
