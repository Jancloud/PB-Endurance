const planService = require("../services/plan");
const { daysBetween, formatDate } = require("./date");

function parsePositiveNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return 0;
  }
  return num;
}

function formatKm(value) {
  const rounded = Number(value.toFixed(1));
  return `${rounded}km`;
}

function splitKm(value) {
  const rounded = Number(value.toFixed(1));
  return {
    number: `${rounded}`,
    unit: "km",
  };
}

function resolveCurrentPosition(startDate, weekCount) {
  const diff = daysBetween(startDate, formatDate(new Date()));
  if (diff < 0) {
    return {
      week: 1,
      dayIndex: 1,
    };
  }
  const week = Math.floor(diff / 7) + 1;
  return {
    week: Math.max(1, Math.min(weekCount || 1, week)),
    dayIndex: (diff % 7) + 1,
  };
}

function sumWeekDistanceKm(week) {
  const weeklyKm = parsePositiveNumber(week.weekly_km);
  if (weeklyKm > 0) {
    return weeklyKm;
  }
  const weeklyComputedKm = parsePositiveNumber(week.weekly_km_computed);
  if (weeklyComputedKm > 0) {
    return weeklyComputedKm;
  }
  return (week.sessions || []).reduce((sum, session) => sum + parsePositiveNumber(session.distance_km), 0);
}

function buildPlanViewModel(planService, activeWeekOverride) {
  const templates = planService.getTemplates();
  const config = planService.getUserPlanConfig();
  const templateIndex = Math.max(0, templates.findIndex((item) => item.name === (config ? config.templateName : "")));
  const selectedTemplate = templates[templateIndex];
  const startDate = (config && config.startDate) || formatDate(new Date());
  const weeks = selectedTemplate ? planService.getWeeksWithStatus(selectedTemplate.name, startDate) : [];
  const currentPosition = resolveCurrentPosition(startDate, weeks.length);
  const displayWeeks = weeks.map((week) => ({
    ...week,
    volumeText: week.volume_note || `周里程 ${sumWeekDistanceKm(week)} km`,
    isCurrentWeek: Number(week.week) === Number(currentPosition.week),
    sessions: (week.sessions || []).map((session) => ({
      ...session,
      isToday:
        Number(week.week) === Number(currentPosition.week) &&
        Number(session.day_index) === Number(currentPosition.dayIndex),
      sessionClass: session.completed
        ? "session-item-done"
        : Number(week.week) === Number(currentPosition.week) &&
          Number(session.day_index) === Number(currentPosition.dayIndex)
        ? "session-item-today"
        : "",
      statusText: session.completed
        ? "✓"
        : Number(week.week) === Number(currentPosition.week) &&
          Number(session.day_index) === Number(currentPosition.dayIndex)
        ? "今日"
        : "待",
      statusClass: session.completed
        ? "status-done"
        : Number(week.week) === Number(currentPosition.week) &&
          Number(session.day_index) === Number(currentPosition.dayIndex)
        ? "status-today"
        : "status-todo",
      distanceText:
        session.distance_km === undefined || session.distance_km === null ? "" : `${session.distance_km} km`,
      paceText: session.pace || "--",
      hasSessionMeta: Boolean(
        (session.distance_km !== undefined && session.distance_km !== null) || (session.pace && session.pace !== "--")
      ),
    })),
  }));
  const completion = selectedTemplate ? planService.getCompletionStats(selectedTemplate.name, startDate) : null;
  const totalDistanceKm = displayWeeks.reduce((sum, week) => sum + sumWeekDistanceKm(week), 0);
  const isSummerPlan = selectedTemplate && selectedTemplate.cycle === "夏训专项";
  const totalDistance = isSummerPlan
    ? { number: ((selectedTemplate.monthlyVolume && selectedTemplate.monthlyVolume[0]) || "--").replace("km", ""), unit: "km" }
    : splitKm(totalDistanceKm);
  const completionPercent = completion ? completion.percent : 0;
  const completionPercentText = `${completionPercent}%`;
  const activeWeek =
    activeWeekOverride !== undefined ? activeWeekOverride : ((displayWeeks[currentPosition.week - 1] && currentPosition.week) || 1);

  return {
    templates,
    templateNames: templates.map((item) => item.name),
    templateIndex,
    startDate,
    minStartDate: formatDate(new Date()),
    weeks: displayWeeks,
    completion,
    activeWeek,
    completionBarWidth: `${completionPercent}%`,
    completionPercentText,
    activeTemplateName: selectedTemplate ? selectedTemplate.name : "训练计划",
    activePlanEvent: selectedTemplate ? selectedTemplate.event : "",
    activePlanCycle: selectedTemplate ? selectedTemplate.cycle : "",
    activeTargetPace: selectedTemplate ? selectedTemplate.targetPace || "--" : "--",
    activePlanSummary: selectedTemplate
      ? selectedTemplate.targetPace
        ? `${selectedTemplate.cycle} · 目标配速 ${selectedTemplate.targetPace}`
        : selectedTemplate.cycle
      : "",
    activeMonthlyVolume: selectedTemplate && selectedTemplate.monthlyVolume ? selectedTemplate.monthlyVolume.join("／") : "",
    activeAudience: selectedTemplate ? selectedTemplate.audience || "" : "",
    activeTestNote: selectedTemplate ? selectedTemplate.testNote || "" : "",
    isSummerPlan,
    weekCountNumber: `${displayWeeks.length}`,
    weekCountUnit: "周",
    doneCountNumber: `${completion ? completion.completed : 0}`,
    doneCountUnit: "次",
    totalDistanceNumber: totalDistance.number,
    totalDistanceUnit: totalDistance.unit,
    distanceMetricLabel: isSummerPlan ? "首月跑量" : "总公里",
    weekCountText: `${displayWeeks.length}周`,
    doneCountText: `${completion ? completion.completed : 0}次`,
    totalDistanceText: formatKm(totalDistanceKm),
  };
}

module.exports = {
  buildPlanViewModel,
};
