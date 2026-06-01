let privateProvider = {};

try {
  // 本地私有配置不入库：weather-provider.private.js
  privateProvider = require("./weather-provider.private");
} catch (error) {
  privateProvider = {};
}

module.exports = {
  // 高德 Web 服务 Key，用于逆地理和实况天气。
  // 复制 weather-provider.private.example.js 为 weather-provider.private.js 后填写真实 Key。
  amapKey: String(privateProvider.amapKey || "").trim(),
};
