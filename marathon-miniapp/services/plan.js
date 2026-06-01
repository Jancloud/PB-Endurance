const planData = require("../data/training_plans");
const { KEYS, get, set } = require("../utils/storage");
const { formatDate, daysBetween } = require("../utils/date");

function normalizeStartDate(startDate) {
  return startDate || formatDate(new Date());
}

function resolveSessionDate(startDate, week, dayIndex) {
  const base = new Date(`${normalizeStartDate(startDate)}T00:00:00`);
  const offset = (Number(week) - 1) * 7 + (Number(dayIndex) - 1);
  base.setDate(base.getDate() + offset);
  return formatDate(base);
}

function isSessionInFuture(startDate, week, dayIndex, forDate = formatDate(new Date())) {
  const sessionDate = resolveSessionDate(startDate, week, dayIndex);
  return daysBetween(sessionDate, forDate) < 0;
}

function resolveTrainingPosition(startDate, forDate = formatDate(new Date())) {
  const diff = daysBetween(startDate, forDate);
  if (diff < 0) {
    return {
      beforeStart: true,
      daysToStart: Math.abs(diff),
      week: 1,
      dayIndex: 1,
    };
  }
  return {
    beforeStart: false,
    daysToStart: 0,
    week: Math.floor(diff / 7) + 1,
    dayIndex: (diff % 7) + 1,
  };
}

function getProgressMap() {
  return get(KEYS.PLAN_PROGRESS, {});
}

function buildProgressKey(templateName, startDate, week, dayIndex) {
  return `${templateName}|${normalizeStartDate(startDate)}|${week}-${dayIndex}`;
}

function isCompleted(templateName, startDate, week, dayIndex) {
  const map = getProgressMap();
  return Boolean(map[buildProgressKey(templateName, startDate, week, dayIndex)]);
}

function toggleCompletedSession(context, week, dayIndex) {
  if (!context || !context.templateName) {
    return { ok: false, reason: "NO_PLAN", completed: false };
  }

  const sessionDate = resolveSessionDate(context.startDate, week, dayIndex);
  if (isSessionInFuture(context.startDate, week, dayIndex, context.today)) {
    return {
      ok: false,
      reason: "FUTURE_SESSION",
      completed: false,
      sessionDate,
    };
  }

  const map = getProgressMap();
  const key = buildProgressKey(context.templateName, context.startDate, week, dayIndex);
  if (map[key]) {
    delete map[key];
  } else {
    map[key] = true;
  }
  set(KEYS.PLAN_PROGRESS, map);

  return {
    ok: true,
    reason: "TOGGLED",
    completed: Boolean(map[key]),
    sessionDate,
  };
}

function getTemplates() {
  return (planData.templates || []).map((item) => ({
    name: item.template_name,
    code: item.template_code,
    targetTimeMinutes: item.target_time_minutes,
    weeksCount: (item.weeks && item.weeks.length) || 0,
  }));
}

function getTemplateByName(templateName) {
  return (planData.templates || []).find((item) => item.template_name === templateName) || null;
}

function getDefaultTemplateName() {
  const templates = getTemplates();
  return templates.length > 0 ? templates[0].name : null;
}

function getUserPlanConfig() {
  const config = get(KEYS.USER_PLAN, null);
  if (config && config.templateName) {
    return config;
  }

  const defaultTemplate = getDefaultTemplateName();
  if (!defaultTemplate) {
    return null;
  }

  const defaultConfig = {
    templateName: defaultTemplate,
    startDate: formatDate(new Date()),
  };
  set(KEYS.USER_PLAN, defaultConfig);
  return defaultConfig;
}

function setUserPlanConfig(templateName, startDate) {
  const next = {
    templateName,
    startDate: startDate || formatDate(new Date()),
  };
  set(KEYS.USER_PLAN, next);
  return next;
}

function resolvePlanContext(templateName, startDate) {
  const config = getUserPlanConfig();
  const resolvedTemplateName = templateName || (config && config.templateName) || "";
  let resolvedStartDate = normalizeStartDate(startDate);

  if (!startDate && config && (!templateName || config.templateName === templateName)) {
    resolvedStartDate = normalizeStartDate(config.startDate);
  }

  return {
    templateName: resolvedTemplateName,
    startDate: resolvedStartDate,
    today: formatDate(new Date()),
  };
}

function buildWeekWithSessionStatus(week, context) {
  return {
    week: week.week,
    phase: week.phase,
    is_deload_week: week.is_deload_week,
    weekly_km: week.weekly_km,
    weekly_km_computed: week.weekly_km_computed,
    weekly_km_mismatch: week.weekly_km_mismatch,
    sessions: (week.sessions || []).map((session) => {
      const isFuture = isSessionInFuture(context.startDate, week.week, session.day_index, context.today);
      return {
        day_index: session.day_index,
        day_label: session.day_label,
        workout_type: session.workout_type,
        distance_km: session.distance_km,
        pace: session.pace,
        description: session.description,
        segment: session.segment,
        session_date: resolveSessionDate(context.startDate, week.week, session.day_index),
        is_future: isFuture,
        completed: isFuture
          ? false
          : isCompleted(context.templateName, context.startDate, week.week, session.day_index),
      };
    }),
  };
}

function getWeeksWithStatus(templateName, startDate) {
  const template = getTemplateByName(templateName);
  if (!template) {
    return [];
  }

  const context = resolvePlanContext(templateName, startDate);
  return (template.weeks || []).map((week) => buildWeekWithSessionStatus(week, context));
}

function toggleCompleted(week, dayIndex) {
  return toggleCompletedSession(resolvePlanContext(), week, dayIndex);
}

function getTodayTask() {
  const config = getUserPlanConfig();
  if (!config) {
    return null;
  }

  const template = getTemplateByName(config.templateName);
  if (!template) {
    return null;
  }

  const position = resolveTrainingPosition(config.startDate, formatDate(new Date()));
  if (position.beforeStart) {
    return {
      templateName: config.templateName,
      done: false,
      startDate: config.startDate,
      daysToStart: position.daysToStart,
      message: `训练尚未开始，将于 ${config.startDate} 开练（还有 ${position.daysToStart} 天）。`,
    };
  }

  const weekData = (template.weeks || []).find((item) => item.week === position.week);
  if (!weekData) {
    return {
      templateName: config.templateName,
      done: true,
      message: "当前训练周期已结束，可切换新计划继续备赛。",
    };
  }

  const session = (weekData.sessions || []).find((item) => item.day_index === position.dayIndex);
  if (!session) {
    return {
      templateName: config.templateName,
      done: false,
      week: position.week,
      dayIndex: position.dayIndex,
      message: "今日无训练安排，建议进行拉伸或主动恢复。",
    };
  }

  return {
    templateName: config.templateName,
    week: position.week,
    dayIndex: position.dayIndex,
    phase: weekData.phase,
    isDeloadWeek: weekData.is_deload_week,
    session: {
      day_index: session.day_index,
      day_label: session.day_label,
      workout_type: session.workout_type,
      distance_km: session.distance_km,
      pace: session.pace,
      description: session.description,
      segment: session.segment,
      completed: isCompleted(config.templateName, config.startDate, position.week, position.dayIndex),
    },
  };
}

function collectCompletableSessions(template) {
  const sessions = [];
  (template.weeks || []).forEach((week) => {
    (week.sessions || []).forEach((session) => {
      if (session.workout_type || session.description) {
        sessions.push({
          week: week.week,
          dayIndex: session.day_index,
        });
      }
    });
  });
  return sessions;
}

function getCompletionStats(templateName, startDate) {
  const template = getTemplateByName(templateName);
  if (!template) {
    return {
      total: 0,
      completed: 0,
      percent: 0,
    };
  }

  const context = resolvePlanContext(templateName, startDate);
  const sessions = collectCompletableSessions(template);
  const completed = sessions.filter((item) => {
    if (isSessionInFuture(context.startDate, item.week, item.dayIndex, context.today)) {
      return false;
    }
    return isCompleted(context.templateName, context.startDate, item.week, item.dayIndex);
  }).length;
  const total = sessions.length;

  return {
    total,
    completed,
    percent: total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0,
  };
}

module.exports = {
  getTemplates,
  getTemplateByName,
  getUserPlanConfig,
  setUserPlanConfig,
  getWeeksWithStatus,
  getTodayTask,
  toggleCompleted,
  getCompletionStats,
};
