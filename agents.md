# PB Fueler 项目知识库（Agent 交接版）

## 1. 项目总览

当前目录包含两条主线：

1. Python 仿真引擎 + Web API/Web UI（`src/pb_fueler` + `ui` + `api`）
2. 微信小程序（`marathon-miniapp`）

核心业务目标：
- 围绕马拉松糖原消耗与补给吸收，预测撞墙风险（Bonk）
- 输出可执行的补给与配速建议
- 支持图形化展示和交互调参

---

## 2. 根目录结构（重点）

- `main.py`：CLI 启动入口（注入 `src` 后调用 `pb_fueler.cli.main`）
- `src/pb_fueler/`：核心 Python 业务代码
- `ui/`：Web 前端静态资源（`index.html` + `styles.css` + `js/*`）
- `api/index.py`：Vercel Python 入口（导出 FastAPI app）
- `marathon-miniapp/`：微信小程序工程（当前高频迭代点）
- `readme.md`：主工程说明（偏完整）
- `PB Fueler.md`：PRD（产品需求与模型背景）
- `vercel.json`：Vercel 路由配置
- `requirements.txt`：当前仅 `fastapi==0.115.5`

备注：
- `tools-mingit` 与压缩包体积较大，属于工具依赖，不是业务核心。

---

## 3. Python 引擎与服务（`src/pb_fueler`）

### 3.1 关键模块

- `calculations.py`：糖耗计算、强度映射、环境修正等
- `simulator.py`：按公里步长模拟（消耗、补给、剩余糖原）
- `planning.py`：自动补给点分配（首支点/末支点/区间插值）
- `optimizer.py`、`decision_point.py`、`rescue_helpers.py`：撞墙后配速优化逻辑
- `ui_payload.py`：仿真结果转 UI JSON
- `coach_*` + `llm_client.py`：LLM 教练建议链路（DeepSeek）
- `webapp.py`：FastAPI 服务（仿真接口 + 教练接口 + 静态页面）
- `cli.py`：命令行参数解析与输出

### 3.2 Web 部署与入口

- 本地 Web 服务：
  - `python -m uvicorn pb_fueler.webapp:app --host 127.0.0.1 --port 8010 --app-dir src`
- Vercel 入口：
  - `api/index.py` -> `from pb_fueler.webapp import app`

### 3.3 LLM 配置（DeepSeek）

- 环境变量：
  - `DEEPSEEK_API_KEY`
  - `DEEPSEEK_API_URL`（可选）
  - `DEEPSEEK_MODEL`（可选）

---

## 4. 微信小程序（`marathon-miniapp`）

## 4.1 基础信息

- 框架：原生微信小程序
- AppID：`wxd9018c1aacbaf35a`（见 `project.config.json`）
- 路由见 `app.json`，当前包含：
  - 首页 `pages/home/index`
  - PB 页面 `pages/fueler/index`
  - 计划/赛事/我的/关于

## 4.2 首页 PB 入口

- 文件：`pages/home/index.wxml`
- 当前入口文案：`PB能量舱`
- 样式：标题已调大并改为白色（`pages/home/index.wxss` 的 `.fueler-title`）

## 4.3 PB能量舱页面（核心迭代区）

文件：
- `pages/fueler/index.js`
- `pages/fueler/index.wxml`
- `pages/fueler/index.wxss`
- `pages/fueler/index.json`（导航标题：`PB能量舱`）

当前已落地能力（按状态）：

1. 图表与展示
- 全程糖原曲线（Canvas）
- 后程放大图（25-42.195km）
- 终点锚线与终点剩余糖原标注
- 关键里程已改为“热力进度条 + 刻度 + 核心数字证据（30/35/40/42）”

2. 参数联动
- 核心参数：体重、VDOT、目标配速、碳水装载、胶数量
- 高级参数：环境温度、单支碳水、肠胃吸收上限（g/h）
- VDOT 锚点改为插值，不再“就近档位卡住”

3. 补给与吸收约束
- 支持自动补给点
- 逐根补给诊断（是否吸收受限）
- UI 橙色“吸收受限”标签与警示文案

4. 性能优化（近期重点）
- 滑块从 `bindchanging` 改为 `bindchange`（松手计算）
- 移除高频闪烁定时器
- 仿真 `series` 不再进入 `setData`，改为 `this.seriesCache`
- 减少逻辑层与视图层的高频同步，降低内存峰值

---

## 5. 天气链路（小程序）

关键文件：
- `marathon-miniapp/services/weather.js`
- `marathon-miniapp/pages/home/index.js`
- `marathon-miniapp/config/weather-provider.js`

## 5.1 当前实现

1. 定位
- `wx.getLocation`（`gcj02`）
- 优先高精度：`isHighAccuracy: true`
- timeout 重试逻辑与冷却机制

2. 天气
- 高德逆地理：`/v3/geocode/regeo`
- 高德实况天气：`/v3/weather/weatherInfo`
- 本地缓存 adcode，失败时回退最近位置
- 再失败则回退离线天气

3. 合规与权限
- `app.json` 含：
  - `permission.scope.userLocation`
  - `requiredPrivateInfos: ["getLocation"]`

## 5.2 已知风险点

- 真机比开发者工具更容易定位超时
- 高精度定位 + 弱网/室内环境会放大失败率
- 若超时进入冷却，短期内会持续失败观感
- 高德 Key 需关注配额与平台类型匹配

---

## 6. 关键配置文件

- 小程序天气 Key：
  - `marathon-miniapp/config/weather-provider.js`
- 小程序全局路由与权限：
  - `marathon-miniapp/app.json`
- 小程序 PB 页面导航名：
  - `marathon-miniapp/pages/fueler/index.json`
- Vercel 路由入口：
  - `vercel.json`
  - `api/index.py`

---

## 7. 运行与调试建议

## 7.1 Python/Web

- CLI：`python main.py ...`
- Web：`uvicorn pb_fueler.webapp:app --app-dir src`

## 7.2 小程序

- 用微信开发者工具导入 `marathon-miniapp`
- 真机联调优先看：
  - 定位失败 `errMsg`
  - 天气接口错误码（Key/配额/超时）

---

## 8. 编码与稳定性注意事项

1. JSON/WXML 编码
- 小程序 `*.json` 避免 UTF-8 BOM（会触发 `Unexpected token \uFEFF`）
- WXML 中 `<` `>` 字符要避免触发标签解析歧义（可用全角符号）

2. 大对象 setData
- 避免将大数组频繁 `setData`（尤其 slider 拖动场景）

3. 渲染降载
- 低端机优先保持“松手计算 + 静态告警”，少做持续动画

---

## 9. 当前命名与文案状态（小程序）

- 首页入口卡片：`PB能量舱`
- PB 页面导航标题：`PB能量舱`
- PB 页面主标题：`PB能量舱`

---

## 10. 后续可优先事项（建议）

1. 天气定位健壮性
- 高精度失败后降级普通定位再试
- 缩短冷却时间并明确失败原因提示

2. 内存进一步优化
- 评估双 Canvas 合并为单 Canvas
- 限制每次重绘对象分配

3. 文档同步
- `readme.md` 与 `marathon-miniapp/README.md` 可补充近期“热力图+性能降载”变更

---

（本文件用于后续 Agent/开发者接手时快速建立上下文）