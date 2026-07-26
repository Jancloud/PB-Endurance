const DAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

function session(dayIndex, workoutType, description, pace, distanceKm) {
  return {
    day_index: dayIndex,
    day_label: DAY_LABELS[dayIndex - 1],
    workout_type: workoutType,
    distance_km: distanceKm === undefined ? null : distanceKm,
    pace: pace || null,
    description,
    segment: null,
  };
}

function trainingSession(dayIndex, description) {
  const [workoutType, ...details] = description.split("｜");
  return session(dayIndex, workoutType, details.join("｜"));
}

function aerobicSession(description, withStrength) {
  return session(1, "有氧慢跑", `${description}${withStrength ? "｜力量训练" : ""}`);
}

function restSession(dayIndex) {
  return session(dayIndex, "休息", "休息");
}

function strengthSession() {
  return session(5, "力量训练", "力量训练");
}

function buildWeek(plan, phaseIndex, weekIndex, weekNumber) {
  const easy = plan.easy[phaseIndex];
  const quality = trainingSession(3, plan.wednesday[phaseIndex][weekIndex]);
  const longRun = trainingSession(7, plan.sunday[phaseIndex][weekIndex]);
  let friday;
  let thursday;
  let monday;

  if (plan.schedule === "full345") {
    monday = aerobicSession(easy, true);
    thursday = session(4, "有氧慢跑", easy);
    friday = strengthSession();
  } else if (plan.schedule === "full400") {
    monday = aerobicSession(easy, true);
    thursday = session(4, "力量训练", "力量训练");
    friday = session(5, "有氧慢跑", `${easy}｜末 1K 提速｜力量训练`);
  } else if (plan.schedule === "half") {
    monday = aerobicSession(easy, true);
    thursday = session(4, "有氧慢跑", `${easy}｜力量训练`);
    friday = strengthSession();
  } else {
    monday = aerobicSession(easy, true);
    thursday = session(4, "有氧慢跑", easy);
    friday = session(5, "有氧慢跑", `${easy}｜力量训练`);
  }

  return {
    week: weekNumber,
    phase: `第 ${phaseIndex + 1} 阶段`,
    is_deload_week: false,
    weekly_km: null,
    weekly_km_computed: null,
    weekly_km_mismatch: false,
    volume_note: `月跑量 ${plan.monthlyVolume[phaseIndex]}`,
    sessions: [monday, restSession(2), quality, thursday, friday, restSession(6), longRun],
  };
}

function createPlan(config) {
  const weeks = [];
  for (let phaseIndex = 0; phaseIndex < 3; phaseIndex += 1) {
    for (let weekIndex = 0; weekIndex < 4; weekIndex += 1) {
      weeks.push(buildWeek(config, phaseIndex, weekIndex, weeks.length + 1));
    }
  }
  return {
    template_name: `${config.event}${config.code}｜夏训12周`,
    template_code: `summer-${config.event === "全马" ? "m" : "h"}-${config.code}`,
    target_time_minutes: config.targetTimeMinutes,
    event: config.event,
    cycle: "夏训专项",
    cycle_weeks: 12,
    target_pace: config.targetPace,
    monthly_volume: config.monthlyVolume,
    audience: config.audience,
    test_note: config.testNote,
    weeks,
  };
}

const templates = [
  createPlan({
    event: "全马",
    code: "255",
    targetTimeMinutes: 175,
    targetPace: "4:06/km",
    monthlyVolume: ["300－335km", "310－345km", "315－350km"],
    audience: "10 公里 38:30／半马 1:24:30，近期月跑量稳定在 300km 以上。",
    schedule: "full",
    easy: ["60－70′｜5:10－5:40/km", "60－70′｜5:10－5:40/km", "60－70′｜5:10－5:40/km"],
    wednesday: [
      ["5321 倒金字塔｜1K@3:46｜休 5′/4′/3′", "12K 马配｜@4:11/km", "2K×6 间歇｜@4:01/km", "5321 倒金字塔｜1K@3:46｜休 5′/4′/3′"],
      ["12K 马配｜@4:08/km", "2K×6 间歇｜@3:58/km", "5321 倒金字塔｜1K@3:43｜休 5′/4′/3′", "12K 马配｜@4:08/km"],
      ["2K×6 间歇｜@3:53/km", "5321 倒金字塔｜1K@3:40｜休 5′/4′/3′", "12K 马配｜@4:05/km", "2K×6 间歇｜@3:53/km"],
    ],
    sunday: [
      ["LSD 长距离｜33－37K｜5:10－5:40/km", "分段加速长距离｜2h｜4:41→4:11/km", "强度有氧长距离｜2h20｜4:38－4:44/km", "LSD 长距离｜2h20"],
      ["LSD 长距离｜34－38K｜5:10－5:40/km", "分段加速长距离｜2h｜4:38→4:08/km", "强度有氧长距离｜2h20｜4:35－4:41/km", "LSD 长距离｜2h20"],
      ["LSD 长距离｜34－38K｜5:10－5:40/km", "分段加速长距离｜2h｜4:35→4:05/km", "强度有氧长距离｜2h20｜4:32－4:38/km", "LSD 长距离｜2h20"],
    ],
    testNote: "30K 自测：前 20K 强度有氧，后 10K 守住约 4:05/km。",
  }),
  createPlan({
    event: "全马",
    code: "300",
    targetTimeMinutes: 180,
    targetPace: "4:13/km",
    monthlyVolume: ["280－315km", "290－325km", "295－330km"],
    audience: "10 公里 39:30／半马 1:27:00，近期月跑量稳定在 280km 以上。",
    schedule: "full",
    easy: ["60－70′｜5:15－5:45/km", "60－70′｜5:15－5:45/km", "60－70′｜5:15－5:45/km"],
    wednesday: [
      ["5321 倒金字塔｜1K@3:53｜休 5′/4′/3′", "12K 马配｜@4:18/km", "2K×6 间歇｜@4:08/km", "5321 倒金字塔｜1K@3:53｜休 5′/4′/3′"],
      ["12K 马配｜@4:15/km", "2K×6 间歇｜@4:05/km", "5321 倒金字塔｜1K@3:50｜休 5′/4′/3′", "12K 马配｜@4:15/km"],
      ["2K×6 间歇｜@4:00/km", "5321 倒金字塔｜1K@3:47｜休 5′/4′/3′", "12K 马配｜@4:12/km", "2K×6 间歇｜@4:00/km"],
    ],
    sunday: [
      ["LSD 长距离｜32－36K｜5:15－5:45/km", "分段加速长距离｜2h｜4:48→4:18/km", "强度有氧长距离｜2h20｜4:45－4:51/km", "LSD 长距离｜2h20"],
      ["LSD 长距离｜33－37K｜5:15－5:45/km", "分段加速长距离｜2h｜4:45→4:15/km", "强度有氧长距离｜2h20｜4:42－4:48/km", "LSD 长距离｜2h20"],
      ["LSD 长距离｜33－37K｜5:15－5:45/km", "分段加速长距离｜2h｜4:42→4:12/km", "强度有氧长距离｜2h20｜4:39－4:45/km", "LSD 长距离｜2h20"],
    ],
    testNote: "30K 自测：前 20K 强度有氧，后 10K 守住约 4:12/km。",
  }),
  createPlan({
    event: "全马",
    code: "315",
    targetTimeMinutes: 195,
    targetPace: "4:37/km",
    monthlyVolume: ["240－275km", "250－285km", "255－290km"],
    audience: "10 公里 44:30／半马 1:38:00，具备稳定长距离基础。",
    schedule: "full",
    easy: ["70′｜5:40－6:10/km", "70′｜5:40－6:10/km", "70′｜5:40－6:10/km"],
    wednesday: [
      ["5321 倒金字塔｜1K@4:17｜休 5′/4′/3′", "12K 分段加速｜4K×3｜5:02→4:42/km", "5321 倒金字塔｜1K@4:17｜休 5′/4′/3′", "12K 分段加速｜4K×3｜5:02→4:42/km"],
      ["5321 倒金字塔｜1K@4:14｜休 5′/4′/3′", "12K 分段加速｜4K×3｜4:59→4:39/km", "5321 倒金字塔｜1K@4:14｜休 5′/4′/3′", "12K 分段加速｜4K×3｜4:59→4:39/km"],
      ["5321 倒金字塔｜1K@4:11｜休 5′/4′/3′", "12K 分段加速｜4K×3｜4:56→4:36/km", "5321 倒金字塔｜1K@4:11｜休 5′/4′/3′", "12K 分段加速｜4K×3｜4:56→4:36/km"],
    ],
    sunday: [
      ["LSD 长距离｜2h40｜5:40－6:10/km", "分段加速长距离｜2h｜5:12→4:42/km", "强度有氧长距离｜2h20｜5:09－5:15/km", "LSD 长距离｜2h40｜5:40－6:10/km"],
      ["分段加速长距离｜2h｜5:09→4:39/km", "强度有氧长距离｜2h20｜5:06－5:12/km", "LSD 长距离｜2h40｜5:40－6:10/km", "分段加速长距离｜2h｜5:09→4:39/km"],
      ["强度有氧长距离｜2h20｜5:03－5:09/km", "LSD 长距离｜2h40｜5:40－6:10/km", "分段加速长距离｜2h｜5:06→4:36/km", "强度有氧长距离｜2h20｜5:03－5:09/km"],
    ],
    testNote: "30K 自测：前 20K 强度有氧，后 10K 守住约 4:37/km。",
  }),
  createPlan({
    event: "全马",
    code: "330",
    targetTimeMinutes: 210,
    targetPace: "4:58/km",
    monthlyVolume: ["210－245km", "220－255km", "225－260km"],
    audience: "10 公里 48:30／半马 1:46:30，具备稳定长距离基础。",
    schedule: "full",
    easy: ["60－70′｜6:00－6:30/km", "60－70′｜6:00－6:30/km", "60－70′｜6:00－6:30/km"],
    wednesday: [
      ["马配节奏跑｜8－10K｜@5:03/km", "12K 分段加速｜4K×3｜5:23→5:03/km", "马配节奏跑｜8－10K｜@5:03/km", "12K 分段加速｜4K×3｜5:23→5:03/km"],
      ["马配节奏跑｜10－12K｜@5:00/km", "12K 分段加速｜4K×3｜5:20→5:00/km", "马配节奏跑｜10－12K｜@5:00/km", "12K 分段加速｜4K×3｜5:20→5:00/km"],
      ["马配节奏跑｜10－12K｜@4:57/km", "12K 分段加速｜4K×3｜5:17→4:57/km", "马配节奏跑｜10－12K｜@4:57/km", "12K 分段加速｜4K×3｜5:17→4:57/km"],
    ],
    sunday: [
      ["LSD 长距离｜2h30－40｜6:00－6:30/km", "末段加速长距离｜24－26K｜末 5K@5:03/km", "LSD 长距离｜2h30－40｜6:00－6:30/km", "强度有氧长距离｜2h10－20｜5:30－5:36/km"],
      ["LSD 长距离｜2h30－40｜6:00－6:30/km", "末段加速长距离｜25－27K｜末 5K@5:00/km", "LSD 长距离｜2h30－40｜6:00－6:30/km", "强度有氧长距离｜2h15｜5:27－5:33/km"],
      ["LSD 长距离｜2h30－40｜6:00－6:30/km", "末段加速长距离｜25－27K｜末 5K@4:57/km", "LSD 长距离｜2h30－40｜6:00－6:30/km", "强度有氧长距离｜2h15｜5:24－5:30/km"],
    ],
    testNote: "30K 自测：前 20K 强度有氧，后 10K 守住约 4:58/km。",
  }),
  createPlan({
    event: "全马",
    code: "345",
    targetTimeMinutes: 225,
    targetPace: "5:19/km",
    monthlyVolume: ["170－190km", "185－210km", "200－230km"],
    audience: "10 公里 51:00／半马 1:53:00，具备稳定跑步基础。",
    schedule: "full345",
    easy: ["50－60′｜6:20－6:50/km", "60′｜6:20－6:50/km", "60′｜6:20－6:50/km"],
    wednesday: [
      ["12K 渐加速｜4K×3｜5:54→5:24/km", "12K 渐加速｜4K×3｜5:54→5:24/km", "12K 渐加速｜4K×3｜5:54→5:24/km", "12K 渐加速｜4K×3｜5:54→5:24/km"],
      ["12K 渐加速｜4K×3｜5:51→5:21/km", "12K 渐加速｜4K×3｜5:51→5:21/km", "12K 渐加速｜4K×3｜5:51→5:21/km", "12K 渐加速｜4K×3｜5:51→5:21/km"],
      ["12K 渐加速｜4K×3｜5:48→5:18/km", "12K 渐加速｜4K×3｜5:48→5:18/km", "12K 渐加速｜4K×3｜5:48→5:18/km", "12K 渐加速｜4K×3｜5:48→5:18/km"],
    ],
    sunday: [
      ["LSD 长距离｜2h20｜6:20－6:50/km", "分段加速长距离｜2h｜6:09→5:24/km", "LSD 长距离｜2h20｜6:20－6:50/km", "分段加速长距离｜2h｜6:09→5:24/km"],
      ["LSD 长距离｜2h30｜6:20－6:50/km", "分段加速长距离｜2h｜6:06→5:21/km", "LSD 长距离｜2h30｜6:20－6:50/km", "分段加速长距离｜2h｜6:06→5:21/km"],
      ["LSD 长距离｜2h40｜6:20－6:50/km", "分段加速长距离｜2h｜6:03→5:18/km", "LSD 长距离｜2h40｜6:20－6:50/km", "分段加速长距离｜2h｜6:03→5:18/km"],
    ],
    testNote: "30K 自测：前 20K 稳定巡航，后 10K 收到 5:17－5:18/km。",
  }),
  createPlan({
    event: "全马",
    code: "400",
    targetTimeMinutes: 240,
    targetPace: "5:41/km",
    monthlyVolume: ["150－175km", "165－195km", "180－215km"],
    audience: "10 公里 55:30／半马 2:02:00，具备稳定跑步基础。",
    schedule: "full400",
    easy: ["50′｜6:45－7:15/km", "60′｜6:45－7:15/km", "65－70′｜6:45－7:15/km"],
    wednesday: [
      ["12K 渐加速｜3K×4｜6:16→6:06→5:56→5:46/km", "12K 渐加速｜3K×4｜6:16→6:06→5:56→5:46/km", "12K 渐加速｜3K×4｜6:16→6:06→5:56→5:46/km", "12K 渐加速｜3K×4｜6:16→6:06→5:56→5:46/km"],
      ["12K 渐加速｜3K×4｜6:13→6:03→5:53→5:43/km", "12K 渐加速｜3K×4｜6:13→6:03→5:53→5:43/km", "12K 渐加速｜3K×4｜6:13→6:03→5:53→5:43/km", "12K 渐加速｜3K×4｜6:13→6:03→5:53→5:43/km"],
      ["12K 渐加速｜3K×4｜6:10→6:00→5:50→5:40/km", "12K 渐加速｜3K×4｜6:10→6:00→5:50→5:40/km", "12K 渐加速｜3K×4｜6:10→6:00→5:50→5:40/km", "12K 渐加速｜3K×4｜6:10→6:00→5:50→5:40/km"],
    ],
    sunday: [
      ["LSD 长距离｜2h10｜6:45－7:15/km", "LSD 长距离｜2h10｜6:45－7:15/km", "LSD 长距离｜2h10｜6:45－7:15/km", "LSD 末段加速｜2h10｜末 3K@5:46/km"],
      ["LSD 长距离｜2h20｜6:45－7:15/km", "LSD 长距离｜2h20｜6:45－7:15/km", "LSD 长距离｜2h20｜6:45－7:15/km", "LSD 末段加速｜2h20｜末 4K@5:43/km"],
      ["LSD 长距离｜2h30｜6:45－7:15/km", "LSD 长距离｜2h30｜6:45－7:15/km", "LSD 长距离｜2h30｜6:45－7:15/km", "LSD 末段加速｜2h30｜末 5K@5:40/km"],
    ],
    testNote: "30K 自测：前 20K 稳定巡航，后 10K 收到 5:39－5:40/km。",
  }),
  createPlan({
    event: "半马",
    code: "125",
    targetTimeMinutes: 85,
    targetPace: "4:00/km",
    monthlyVolume: ["160－185km", "170－200km", "180－215km"],
    audience: "10 公里 40:30／半马 1:30，能稳定跑四休三。",
    schedule: "half",
    easy: ["50－60′｜5:00－5:30/km", "50－60′｜5:00－5:30/km", "50－60′｜5:00－5:30/km"],
    wednesday: [
      ["2K 间歇｜2K×4｜@3:57－3:59/km｜组休 3′", "节奏跑｜8K@4:05/km", "变速跑｜3K×3@4:05/km｜间 1K 慢跑", "2K 间歇｜2K×4｜@3:57－3:59/km｜组休 3′"],
      ["节奏跑｜9K@4:02/km", "变速跑｜3K×3@4:02/km｜间 1K 慢跑", "2K 间歇｜2K×5｜@3:53－3:55/km｜组休 3′", "节奏跑｜9K@4:02/km"],
      ["变速跑｜3K×3@3:59/km｜间 1K 慢跑", "2K 间歇｜2K×5｜@3:49－3:52/km｜组休 3′", "节奏跑｜10K@3:59/km", "变速跑｜3K×3@3:59/km｜间 1K 慢跑"],
    ],
    sunday: [
      ["LSD 长距离｜15K｜5:00－5:30/km", "LSD 末段加速｜15K｜末 3K@4:05/km", "LSD 长距离｜15K｜5:00－5:30/km", "LSD 末段加速｜15K｜末 3K@4:05/km"],
      ["LSD 长距离｜16K｜5:00－5:30/km", "LSD 末段加速｜16K｜末 3K@4:02/km", "LSD 长距离｜16K｜5:00－5:30/km", "LSD 末段加速｜16K｜末 3K@4:02/km"],
      ["LSD 长距离｜17K｜5:00－5:30/km", "LSD 末段加速｜17K｜末 3K@3:59/km", "LSD 长距离｜17K｜5:00－5:30/km", "LSD 末段加速｜17K｜末 3K@3:59/km"],
    ],
    testNote: "15K 自测：前 3K 强度有氧，后 12K 顶到 3:59－4:00/km。",
  }),
  createPlan({
    event: "半马",
    code: "130",
    targetTimeMinutes: 90,
    targetPace: "4:13/km",
    monthlyVolume: ["145－170km", "155－185km", "165－200km"],
    audience: "10 公里 43:00／半马 1:35，能稳定跑四休三。",
    schedule: "half",
    easy: ["50－60′｜5:15－5:45/km", "50－60′｜5:15－5:45/km", "50－60′｜5:15－5:45/km"],
    wednesday: [
      ["2K 间歇｜2K×4｜@4:10－4:12/km｜组休 3′", "节奏跑｜8K@4:18/km", "变速跑｜3K×3@4:18/km｜间 1K 慢跑", "2K 间歇｜2K×4｜@4:10－4:12/km｜组休 3′"],
      ["节奏跑｜9K@4:15/km", "变速跑｜3K×3@4:15/km｜间 1K 慢跑", "2K 间歇｜2K×5｜@4:06－4:08/km｜组休 3′", "节奏跑｜9K@4:15/km"],
      ["变速跑｜3K×3@4:12/km｜间 1K 慢跑", "2K 间歇｜2K×5｜@4:02－4:05/km｜组休 3′", "节奏跑｜10K@4:12/km", "变速跑｜3K×3@4:12/km｜间 1K 慢跑"],
    ],
    sunday: [
      ["LSD 长距离｜15K｜5:15－5:45/km", "LSD 末段加速｜15K｜末 3K@4:18/km", "LSD 长距离｜15K｜5:15－5:45/km", "LSD 末段加速｜15K｜末 3K@4:18/km"],
      ["LSD 长距离｜16K｜5:15－5:45/km", "LSD 末段加速｜16K｜末 3K@4:15/km", "LSD 长距离｜16K｜5:15－5:45/km", "LSD 末段加速｜16K｜末 3K@4:15/km"],
      ["LSD 长距离｜17K｜5:15－5:45/km", "LSD 末段加速｜17K｜末 3K@4:12/km", "LSD 长距离｜17K｜5:15－5:45/km", "LSD 末段加速｜17K｜末 3K@4:12/km"],
    ],
    testNote: "15K 自测：前 3K 强度有氧，后 12K 顶到 4:12－4:13/km。",
  }),
  createPlan({
    event: "半马",
    code: "145",
    targetTimeMinutes: 105,
    targetPace: "4:56/km",
    monthlyVolume: ["120－145km", "130－160km", "140－175km"],
    audience: "10 公里 50:00／半马 1:52，能稳定跑四休三。",
    schedule: "half",
    easy: ["50－60′｜6:00－6:30/km", "50－60′｜6:00－6:30/km", "50－60′｜6:00－6:30/km"],
    wednesday: [
      ["半马配速节奏跑｜8K@5:01/km", "10K 渐加速｜2K 有氧＋4K 强有氧＋4K@5:01/km", "半马配速节奏跑｜8K@5:01/km", "10K 渐加速｜2K 有氧＋4K 强有氧＋4K@5:01/km"],
      ["半马配速节奏跑｜9K@4:58/km", "10K 渐加速｜2K 有氧＋4K 强有氧＋4K@4:58/km", "半马配速节奏跑｜9K@4:58/km", "10K 渐加速｜2K 有氧＋4K 强有氧＋4K@4:58/km"],
      ["半马配速节奏跑｜10K@4:55/km", "10K 渐加速｜2K 有氧＋4K 强有氧＋4K@4:55/km", "半马配速节奏跑｜10K@4:55/km", "10K 渐加速｜2K 有氧＋4K 强有氧＋4K@4:55/km"],
    ],
    sunday: [
      ["LSD 长距离｜15K｜6:00－6:30/km", "LSD 末段加速｜15K｜末 3K@5:01/km", "LSD 长距离｜15K｜6:00－6:30/km", "LSD 末段加速｜15K｜末 3K@5:01/km"],
      ["LSD 长距离｜16K｜6:00－6:30/km", "LSD 末段加速｜16K｜末 3K@4:58/km", "LSD 长距离｜16K｜6:00－6:30/km", "LSD 末段加速｜16K｜末 3K@4:58/km"],
      ["LSD 长距离｜17K｜6:00－6:30/km", "LSD 末段加速｜17K｜末 3K@4:55/km", "LSD 长距离｜17K｜6:00－6:30/km", "LSD 末段加速｜17K｜末 3K@4:55/km"],
    ],
    testNote: "16K 自测：前 10K 强度有氧，后 6K 收到 4:55－4:56/km。",
  }),
  createPlan({
    event: "半马",
    code: "200",
    targetTimeMinutes: 120,
    targetPace: "5:38/km",
    monthlyVolume: ["90－115km", "100－130km", "110－145km"],
    audience: "10 公里 57:30／半马 2:10，能稳定跑四休三。",
    schedule: "half",
    easy: ["50－60′｜6:40－7:10/km", "50－60′｜6:40－7:10/km", "50－60′｜6:40－7:10/km"],
    wednesday: [
      ["8K 渐进质量课｜4K 有氧＋4K@5:43/km", "8K 渐进质量课｜4K 有氧＋4K@5:43/km", "8K 渐进质量课｜4K 有氧＋4K@5:43/km", "8K 渐进质量课｜4K 有氧＋4K@5:43/km"],
      ["9K 渐进质量课｜3K 有氧＋3K 强有氧＋3K@5:40/km", "9K 渐进质量课｜3K 有氧＋3K 强有氧＋3K@5:40/km", "9K 渐进质量课｜3K 有氧＋3K 强有氧＋3K@5:40/km", "9K 渐进质量课｜3K 有氧＋3K 强有氧＋3K@5:40/km"],
      ["10K 渐进质量课｜5K 有氧＋5K@5:37/km", "10K 渐进质量课｜5K 有氧＋5K@5:37/km", "10K 渐进质量课｜5K 有氧＋5K@5:37/km", "10K 渐进质量课｜5K 有氧＋5K@5:37/km"],
    ],
    sunday: [
      ["LSD 长距离｜14K｜6:40－7:10/km", "LSD 长距离｜14K｜6:40－7:10/km", "LSD 长距离｜14K｜6:40－7:10/km", "LSD 长距离｜14K｜6:40－7:10/km"],
      ["LSD 长距离｜15K｜6:40－7:10/km", "LSD 末段加速｜15K｜末 2K@5:40/km", "LSD 长距离｜15K｜6:40－7:10/km", "LSD 末段加速｜15K｜末 2K@5:40/km"],
      ["LSD 长距离｜16K｜6:40－7:10/km", "LSD 末段加速｜16K｜末 3K@5:37/km", "LSD 长距离｜16K｜6:40－7:10/km", "LSD 末段加速｜16K｜末 3K@5:37/km"],
    ],
    testNote: "16K 自测：前 10K 强度有氧，后 6K 收到 5:37－5:38/km。",
  }),
];

module.exports = { templates };
