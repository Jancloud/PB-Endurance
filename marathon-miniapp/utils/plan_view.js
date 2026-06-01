const planService = require("../services/plan");
const { formatDate } = require("./date");

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
  const displayWeeks = weeks.map((week) => ({
    ...week,
    sessions: (week.sessions || []).map((session) => ({
      ...session,
      distanceText:
        session.distance_km === undefined || session.distance_km === null ? "无需里程" : `${session.distance_km} km`,
      paceText: session.pace || "--",
    })),
  }));
  const completion = selectedTemplate ? planService.getCompletionStats(selectedTemplate.name, startDate) : null;
  const totalDistanceKm = displayWeeks.reduce((sum, week) => sum + sumWeekDistanceKm(week), 0);
  const completionPercent = completion ? completion.percent : 0;

  return {
    templates,
    templateNames: templates.map((item) => item.name),
    templateIndex,
    startDate,
    minStartDate: formatDate(new Date()),
    weeks: displayWeeks,
    completion,
    activeWeek: activeWeekOverride !== undefined ? activeWeekOverride : ((displayWeeks[0] && displayWeeks[0].week) || 1),
    completionBarWidth: `${completionPercent}%`,
    activeTemplateName: selectedTemplate ? selectedTemplate.name : "训练计划",
    weekCountText: `${displayWeeks.length}周`,
    doneCountText: `${completion ? completion.completed : 0}次`,
    totalDistanceText: formatKm(totalDistanceKm),
  };
}

module.exports = {
  buildPlanViewModel,
};
