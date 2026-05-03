# PB Fueler

## 项目目标
PB Fueler 是一个用于马拉松补给策略评估的仿真工具。它通过模拟糖原消耗与补给吸收过程，预测是否会在比赛中出现“撞墙”（Bonk），并给出可执行的补给与配速建议。

## 核心功能
1. 参数输入：体重、VDOT、目标配速、赛前碳水装载程度、环境温度、单支能量胶碳水含量。
2. 补给配置：手动补给公里点或智能自动分配。
3. 仿真引擎：按 1km 步长计算糖原余额，包含吸收延迟与每小时吸收上限。
4. 结果输出：42km 糖原曲线（表格形式）、Bonk Point 预测。
5. 数据导出：支持 CSV 导出，便于 Excel/Matplotlib 画图。
6. 移动端布局优化：抽屉按钮使用安全区自适应贴底，减少按钮上方无效留白。
7. 抽屉交互优化：支持收起/半开/全开三态与滑动吸附，避免调参时完全遮挡图表。
8. 参数分组：核心参数常驻一级面板，高级参数折叠到二级面板。
9. 移动端抽屉改为“推挤式”布局：展开时不覆盖补给计划卡片，而是占据页面流空间。
10. 补给计划移动端改为单行横向滑轨，减少垂直占用。

## 当前文件结构
- `PB Fueler.md`：产品需求文档（PRD）。
- `main.py`：CLI 启动入口。
- `src/pb_fueler/models.py`：数据结构定义。
- `src/pb_fueler/calculations.py`：数学公式与分段线性映射。
- `src/pb_fueler/simulator.py`：仿真主循环（含吸收延迟与滚动每小时吸收限流）。
- `src/pb_fueler/planning.py`：补给点自动分配算法。
- `src/pb_fueler/exporters.py`：CSV 导出逻辑。
- `src/pb_fueler/decision_point.py`：Bonk 前 3-5km 决策点选择（含 15% 电量阈值）。
- `src/pb_fueler/rescue_helpers.py`：分段配速模拟与完赛时间估算工具。
- `src/pb_fueler/optimizer.py`：后程降速反推求解器（目标：终点糖原接近 0g）。
- `src/pb_fueler/formatters.py`：配速与时长格式化工具。
- `src/pb_fueler/ui_payload.py`：将仿真结果封装成 UI JSON。
- `src/pb_fueler/coach_payload.py`：教练输入 JSON 契约。
- `src/pb_fueler/coach_payload_schema.py`：教练载荷类型与字段校验。
- `src/pb_fueler/coach_prompt.py`：DeepSeek 提示词拼装。
- `src/pb_fueler/coach_rules.py`：补给点安全间隔与 WILLPOWER_ZONE 规则。
- `src/pb_fueler/coach_templates.py`：本地回退建议模板（逻辑驱动）。
- `src/pb_fueler/coach_guard.py`：LLM 输出纠偏守卫（去重、间隔、基数一致）。
- `src/pb_fueler/llm_client.py`：DeepSeek 调用封装与超时回退。
- `src/pb_fueler/coach_service.py`：教练文案编排层。
- `src/pb_fueler/webapp.py`：Web 服务入口（FastAPI + /api/simulate + /api/coach-advice + 静态 UI）。
- `src/pb_fueler/cli.py`：命令行参数解析与输出格式。
- `ui/index.html`：UI 原型页面入口。
- `ui/styles.css`：UI 原型样式。
- `ui/js/main.js`：UI 启动与联动编排。
- `ui/js/api.js`：前端请求层。
- `ui/js/chart.v20261103.js`：图表渲染与 BONK 闪烁。
- `ui/js/controls.js`：控件联动与策略卡片文案更新。
- `ui/js/coach_ui.js`：LLM 请求时的 Loading 与教练文案渲染。
- `ui/js/utils.js`：通用工具（时间格式化、debounce）。
- `ui/preview.png`：UI 效果截图。
- `ui/preview-live.png`：联动版 UI 截图。

## 核心参数与规则
1. 糖耗占比映射：
   - `Intensity = Current_Pace_Velocity / VDOT_Pace_Velocity`
   - `<60% => 0.50`
   - `80% => 0.82`
   - `88% => 0.92`
   - `>95% => 1.00`
   - 区间内部使用线性插值。
2. 初始糖原：
   - `Total_Capacity = Weight * 7.5`
   - `Initial_G = Total_Capacity * Loading_Percentage`
3. 环境温度修正：
   - 默认温度 `12°C`（黄金温度）。
   - 若温度 `>15°C`，每升高 `1°C`，糖原消耗额外增加 `1%`。
   - 最终作用在 `g_burned` 上，作为最终乘数。
4. 爬升修正：
   - 可选输入 `total_climb`（总爬升，单位 m）。
   - 若提供三段爬升（start/mid/end），优先按三段分配每公里爬升额外能耗。
   - 否则按总爬升在引擎离散步长（当前 42km）上平均分配。
   - 先将爬升折算为额外 kcal，再和基础 kcal 累加，最后统一通过 `carb_ratio` 转成糖耗。

## 自动补给点算法（--auto-gels）
1. 首支点固定在 `6km`（满足 5-7km 提前开启）。
2. 末支点固定在 `35km`（不晚于 35km）。
3. 中间点在 `7-35km` 区间内等分插值。
4. 仅在未提供 `--gel-km` 时生效。

## Pace_Solver（--optimize）
仅当传入 `--optimize` 时触发：
1. 触发条件：原始仿真检测到 Bonk Point。
2. 变量锁定：`1 ~ (Bonk-5)km` 配速和补给点保持不变。
3. 优化区间：`(Bonk-4)km ~ 终点`，统一求一个后段配速。
4. 优化目标：后段配速“尽量快”，同时终点剩余糖原达到 `15g` 安全冗余。
5. 求解方法：二分法搜索后段配速。
6. 输出结果：分段配速建议 + 调整后的预计完赛时间。
7. 无解判定：若后段降到 `06:00/km` 仍达不到 `15g`，输出补给总数/Loading 的具体修正建议。

## DeepSeek 教练层
1. 数值引擎先输出结构化 JSON，再交给 DeepSeek 做文案润色。
2. 新增接口：`POST /api/coach-advice`。
3. LLM 失败、超时或未配置密钥时，自动回退到本地教练文案。
4. 前端请求教练文案期间，策略摘要区显示萤光蓝 Loading 动画。
5. 触发方式：滑块/参数变化只更新本地仿真与图表，不会自动请求 DeepSeek；需点击“优化建议”按钮才会刷新教练建议。
6. 事实约束：
   - `current_inventory` 是补给事实唯一真理（比赛中胶数量与已安排公里点）。
   - 后处理会强制执行“禁止重复点位 + 至少 5km 间隔 + 基数一致”。
7. WILLPOWER_ZONE：
   - 当 `bonk_km > 40.5` 时，置 `willpower_zone=true`。
   - 本地回退与 LLM 纠偏都共享该上下文，强制优先输出心理与配速策略，不再新增补给点。
8. 纠偏日志：
   - 若 LLM 输出与约束冲突，服务会输出 `coach_guard_corrected` 日志，包含修正原因和前后对比。
9. 环境变量：
   - `DEEPSEEK_API_KEY`
   - `DEEPSEEK_API_URL`（可选，默认 `https://api.deepseek.com/chat/completions`）
   - `DEEPSEEK_MODEL`（可选，默认 `deepseek-chat`）

## 使用方法
### 1) 手动补给点
```bash
python main.py --weight 65 --vdot 53.6 --pace 255 --loading 100 --gel-km 7,14,21,27,32,37
```

### 2) 智能自动分配补给点
```bash
python main.py --weight 65 --vdot 53.6 --pace 255 --loading 100 --auto-gels 6
```

### 3) 导出 CSV（用于画图）
```bash
python main.py --weight 65 --vdot 53.6 --pace 255 --loading 100 --auto-gels 6 --export csv --export-path output/run_auto6.csv
```

### 4) 触发 Pace_Solver（示例）
```bash
python main.py --weight 65 --vdot 53.6 --pace 250 --loading 70 --gel-km 6,12,18,24,30,32,34,36,38,40 --optimize
```
在该示例中会出现约 `30km` 撞墙，并给出锁定前段后的分段配速建议。

## CLI 参数说明
- `--weight`：体重（kg）
- `--vdot`：VDOT 数值
- `--pace`：目标配速（秒/公里）
- `--loading`：碳水装载百分比（0-100）
- `--ambient-temp`：环境温度（°C，默认 12）
- `--total-climb`：总爬升（m）
- `--climb-start`：前段爬升（m，1-14km）
- `--climb-mid`：中段爬升（m，15-28km）
- `--climb-end`：后段爬升（m，29-42km）
  - 注意：分段模式必须同时提供这三个参数，否则会报参数错误。
- `--gel-km`：补给公里列表（逗号分隔）
- `--auto-gels`：自动补给总次数（仅在未提供 `--gel-km` 时生效）
- `--gel-carb`：每次补给碳水克数（默认 25）
- `--optimize`：启用 Pace_Solver（Bonk 时触发二分法优化）
- `--export`：导出格式（当前支持 `csv`）
- `--export-path`：CSV 导出路径

## CSV 字段说明
- `km`：公里数（1-42）
- `remaining_g`：当前公里结束后的剩余糖原（g）
- `intensity`：当前配速强度（相对 VDOT 速度）
- `absorption_active`：该公里是否有补给吸收（1/0）
- `is_bonk`：该公里是否为首次撞墙点（1/0）

## UI 原型预览
推荐在项目根目录启动联动服务：
```bash
python -m uvicorn pb_fueler.webapp:app --host 127.0.0.1 --port 8010 --app-dir src
```
然后访问：
- `http://127.0.0.1:8010/ui/index.html`
