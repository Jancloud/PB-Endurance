const LAST_AMAP_GEO_KEY = "last_amap_geo";

function readCachedGeo() {
  try {
    const value = wx.getStorageSync(LAST_AMAP_GEO_KEY);
    if (!value || !value.adcode) {
      return null;
    }
    return {
      adcode: String(value.adcode),
      city: String(value.city || "当前位置"),
      savedAt: Number(value.savedAt || 0),
    };
  } catch (error) {
    return null;
  }
}

function writeCachedGeo(geo) {
  try {
    wx.setStorageSync(LAST_AMAP_GEO_KEY, {
      adcode: String(geo.adcode || ""),
      city: String(geo.city || "当前位置"),
      savedAt: Date.now(),
    });
  } catch (error) {
    // ignore storage error
  }
}

module.exports = {
  readCachedGeo,
  writeCachedGeo,
};
