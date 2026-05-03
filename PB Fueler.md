产品需求文档 (PRD)：PB Fueler 补给仿真引擎
1. 产品定义
PB Fueler 是一个面向硬核马拉松跑者的“能量管理可视化”工具。它通过模拟人体糖原储备与消耗的过程，为全马比赛提供科学的补给点位建议。

2. 核心数学模型
引擎的逻辑基于以下三个核心公式的离散化实现：

2.1 能量总消耗 (EE)
公式：Total_Energy (kcal) = Weight (kg) * Distance (km) * 1.03

备注：1.03 是针对进阶跑者的能耗系数常数。

2.2 供能比例模型 (Substrate Partitioning)
公式：Carb_Burn_Rate = f(Pace, VDOT)

逻辑：通过 VDOT 逆推当前配速占最大摄氧量 (VO2max) 的百分比。

阈值参考：

低强度 (E区间): 糖供能约 50%

马拉松强度 (M区间): 糖供能约 80%-90%

超过乳酸阈值 (T区间): 糖供能趋近 100%

2.3 糖原存量平衡 (The Balance Sheet)
公式：Remaining_Glycogen = Initial_G + Absorbed_G - Burned_G

能量转化率：1克碳水化合物 = 4 kcal。

3. 功能模块需求
3.1 参数输入模块 (Inputs)
跑者画像： 体重 (kg)、当前 VDOT (或近期 5km/10km/半马成绩)。

目标设定： 全马目标时间 (如 03:00:00) 或 目标配速 (如 04:15 min/km)。

初始状态： 赛前碳水装载程度 (0% - 100%)。

3.2 补给定义模块 (Fuel Config)
能量胶属性： 单根含碳水克数 (默认 25g)。

补给计划： 用户可输入补给的总数量 (例如 6 根) 或 指定补给公里点 (例如 7, 14, 21, 27, 32, 37 km)。

3.3 仿真执行引擎 (Simulation Engine)
步长： 以 1 公里为步长进行循环计算。

吸收延迟逻辑： 补给动作触发后，碳水并非立即进入存量池，需设置 2-3 公里的“吸收延迟期”。

肠道限制： 设定每小时吸收上限 (Max 90g/hr)，超过部分不计入存量池。

3.4 结果输出模块 (Outputs)
糖原曲线： 输出 1-42km 每公里的剩余糖原数值。

撞墙预测： 若糖原归零，标记该公里数为 "Bonk Point"。

优化建议： 如果出现撞墙，建议调低目标配速或增加补给频率。

4. 开发者实现逻辑建议 (伪代码)
JSON
// 配置参考
{
  "weight": 65,
  "vdot": 53.6,
  "target_pace_seconds": 255, 
  "initial_glycogen_g": 480,
  "gel_list": [7, 14, 21, 27, 32, 37]
}
Python
# 核心循环逻辑示例
def run_simulation(data):
    current_g = data.initial_glycogen_g
    absorption_queue = [] # 处理延迟吸收的队列
    
    for km in range(1, 43):
        # 1. 计算本公里消耗
        kcal_burned = data.weight * 1.03
        carb_ratio = calculate_carb_ratio(data.target_pace, data.vdot)
        g_burned = (kcal_burned * carb_ratio) / 4
        
        # 2. 处理补给输入
        if km in data.gel_list:
            absorption_queue.append({"ready_at": km + 2, "amount": 25})
            
        # 3. 处理补给吸收
        for item in absorption_queue:
            if item["ready_at"] == km:
                current_g += item["amount"]
        
        # 4. 更新存量
        current_g -= g_burned
        
        # 5. 撞墙判定
        if current_g <= 0:
            return f"Warning: Bonk predicted at {km}km"
            
    return "Finish Success: Strategy is viable"
5. UI/UX 风格导向 (供后续开发参考)
视觉风格： 延续 PB Vision 的 Cyber Blue 风格。

关键图表： 一个垂直的“电量条”代表糖原存量，随着公里数推进不断下降，而在补给点会有微弱的回升波动。