# PB 小程序架构说明

## 分层约定
- `pages/`：只做页面编排、事件响应、`setData`。
- `services/`：只做数据读取、缓存、外部请求、业务状态管理。
- `utils/`：只做纯函数、格式化、视图模型、绘图。
- `config/`：只放静态配置。

## 当前职责边界
- 首页：天气、训练计划、目标赛事、入口卡片。
- 计划页：训练模板选择、计划进度、周计划展开。
- 赛事页：筛选、月份分组、日历格子、目标赛事管理。
- PB 页面：糖原仿真、补给诊断、图表绘制、参数联动。

## 约束
- 页面不直接写复杂筛选、汇总、映射逻辑。
- 页面不直接处理缓存与请求重试。
- 重复三次以上的逻辑必须抽成公共模块。
- 大数组和图表数据不随滑动频繁整块刷新。

## 近期已抽出的模块
- `utils/tabbar.js`
- `utils/home_view.js`
- `utils/plan_view.js`
- `utils/race_view.js`
- `utils/fueler_view.js`
- `utils/fueler_state.js`
- `utils/fueler_chart.js`
- `utils/profile_view.js`
- `services/location.js`
- `services/weather_cache.js`
- `services/weather_client.js`
- `services/weather_normalizer.js`
- `services/home_weather.js`

## 维护建议
- 新页面先写 view model，再写页面。
- 新外部能力先拆 client/cache/normalizer，再接入页面。
- 不要把业务逻辑塞回 `pages/*.js`。
