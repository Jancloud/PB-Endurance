# PB 日历小程序

原生微信小程序，用于马拉松备赛管理与 PB 能量策略推演。

## 当前能力
- 首页：训练环境诊断（温度、湿度、露点）、今日训练 Hero、本周训练概览、下一场目标赛事。
- 训练计划：训练模板选择、起始日期设置、周计划展开、训练打卡。
- 赛事：赛事列表、筛选、月份日历、目标赛事管理。
- 我的：训练计划概览、目标赛事数量、数据重置。
- PB能量舱：体重、VDOT、目标配速、碳水装载、能量胶、温度、吸收上限联动推演撞墙风险。

## 目录结构
```text
marathon-miniapp/
├─ app.js
├─ app.json
├─ app.wxss
├─ config/
├─ custom-tab-bar/
├─ data/
├─ pages/
│  ├─ home/
│  ├─ fueler/
│  ├─ plan/
│  ├─ race/
│  ├─ profile/
│  └─ about/
├─ services/
└─ utils/
```

## 分层约定
- `pages/`：页面生命周期、用户事件、`setData`。
- `services/`：数据读取、本地存储、外部请求、业务状态编排。
- `utils/`：纯函数、日期计算、格式化、视图模型、Canvas 绘图。
- `config/`：静态配置。

## 近期结构拆分
- 首页天气链路：`services/home_weather.js` 负责定位、重试、缓存位置和回退天气。
- 天气底层：`services/location.js`、`weather_cache.js`、`weather_client.js`、`weather_normalizer.js`。
- 训练计划：`services/plan.js` 保留对外门面，内部按模板、日期、打卡进度、完成率分区，避免新增模块导致热重载漏注册。
- PB能量舱：`utils/fueler_state.js` 负责仿真状态组装，`utils/fueler_view.js` 负责参数提示与热力图模型，`utils/fueler_chart.js` 负责绘图。
- 页面视图模型：`utils/home_view.js`、`plan_view.js`、`race_view.js`、`profile_view.js`。

## 本地运行
1. 打开微信开发者工具。
2. 导入目录：`C:\codex\PB Fueler\marathon-miniapp`。
3. AppID 使用 `project.config.json` 中的 `wxd9018c1aacbaf35a`。
4. 若本地调试天气接口，可在开发者工具中临时开启“不校验合法域名”。

## 天气配置
1. 复制 `config/weather-provider.private.example.js` 为 `config/weather-provider.private.js`。
2. 在 `weather-provider.private.js` 中填写高德 Web 服务 Key。
3. `weather-provider.private.js` 已加入 `.gitignore`，不要提交真实 Key。

## 维护规则
- 新页面先写 view model，再接页面。
- 新外部接口先拆 client/cache/normalizer，再接页面。
- 页面不要直接处理复杂筛选、日期计算、请求重试或存储细节。
- 大数组和图表数据不要高频 `setData`。
