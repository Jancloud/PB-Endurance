function formatKm(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return "0";
  }
  return numberValue % 1 === 0 ? String(numberValue) : numberValue.toFixed(1);
}

function normalizeSessionDistance(session) {
  const distance = Number(session && session.distance_km);
  return Number.isFinite(distance) && distance > 0 ? distance : 0;
}

function compactDayLabel(dayLabel) {
  const text = String(dayLabel || "").trim();
  if (!text) {
    return "--";
  }
  return text.replace(/^周/, "") || text;
}

function formatRaceDate(dateText) {
  const match = String(dateText || "").trim().match(/^\d{4}-(\d{1,2})-(\d{1,2})$/);
  if (!match) {
    return "";
  }
  return `${Number(match[1])}月${Number(match[2])}日`;
}

function buildTargetRaceCards(targetRaces) {
  return (targetRaces || []).slice(0, 3).map((item) => {
    const displayDate = item.displayDate || item.date || item.rawDateText || "待公布";
    if (item.countdown && item.countdown.isUnknown) {
      return {
        id: item.id,
        name: item.name,
        city: item.city,
        date: displayDate,
        countdownSummary: "比赛日期待公布",
        weeksBadgeText: "待定",
      };
    }
    if (item.countdown && item.countdown.isOver) {
      return {
        id: item.id,
        name: item.name,
        city: item.city,
        date: displayDate,
        countdownSummary: "比赛已开始",
        weeksBadgeText: "已开赛",
      };
    }
    return {
      id: item.id,
      name: item.name,
      city: item.city,
      date: displayDate,
      countdownSummary: `距离开赛 ${item.countdownDays}天 ${item.countdownHours}小时${item.countdownMinutes}分`,
      weeksBadgeText: `约 ${item.trainingWeeks} 周`,
    };
  });
}

function buildRaceCountdownHint(targetRaces) {
  const list = (targetRaces || []).filter(
    (item) => item && item.countdown && !item.countdown.isUnknown && !item.countdown.isOver
  );
  if (!list.length) {
    return {
      hasRaceHint: false,
      raceHintText: "",
      raceHintName: "",
      raceHintSubtitle: "",
      raceHintDateText: "",
      raceHintDaysText: "--",
    };
  }

  const nearest = list
    .slice()
    .sort((a, b) => Number(a.countdown.totalMinutes || 0) - Number(b.countdown.totalMinutes || 0))[0];

  const dateText = formatRaceDate(nearest.date);
  const cityText = nearest.city || "";
  const distanceText = nearest.distance || "";
  const subtitle = [dateText, cityText, distanceText].filter(Boolean).join(" · ");

  return {
    hasRaceHint: true,
    raceHintText: `还有 ${nearest.countdownDays} 天`,
    raceHintName: nearest.name || "目标赛事",
    raceHintSubtitle: subtitle || "目标赛事",
    raceHintDateText: dateText,
    raceHintDaysText: `${nearest.countdownDays}`,
  };
}

function buildTaperReminder(targetRaces) {
  const candidates = (targetRaces || [])
    .filter(
      (item) =>
        item &&
        item.countdown &&
        !item.countdown.isUnknown &&
        !item.countdown.isOver &&
        Number.isFinite(Number(item.countdownDays)) &&
        Number(item.countdownDays) <= 21
    )
    .sort((a, b) => Number(a.countdown.totalMinutes || 0) - Number(b.countdown.totalMinutes || 0));

  const race = candidates[0];
  if (!race) {
    return {
      showTaperReminder: false,
      taperReminderText: "",
      taperReminderRaceName: "",
    };
  }

  return {
    showTaperReminder: true,
    taperReminderRaceName: race.name || "目标赛事",
    taperReminderText: `${race.countdownDays}天 ${race.countdownHours}小时${race.countdownMinutes}分后开赛，建议开始“减总量、保强度、保频率”的赛前减量。`,
  };
}

function buildWeekOverview(currentWeek) {
  if (!currentWeek || !Array.isArray(currentWeek.sessions)) {
    return {
      hasWeekOverview: false,
      weekOverview: null,
    };
  }

  const sessions = currentWeek.sessions || [];
  const runSessions = sessions.filter((session) => normalizeSessionDistance(session) > 0);
  const plannedKm = runSessions.reduce((sum, session) => sum + normalizeSessionDistance(session), 0);
  const completedCount = sessions.filter((session) => session.completed).length;
  const completableCount = sessions.filter((session) => session.workout_type || session.description).length;
  const maxDistance = Math.max(1, ...sessions.map(normalizeSessionDistance));
  const bars = sessions.map((session) => {
    const distance = normalizeSessionDistance(session);
    const height = Math.max(12, Math.round((distance / maxDistance) * 76));
    return {
      label: session.day_label || "--",
      shortLabel: compactDayLabel(session.day_label),
      height: `${height}rpx`,
      className: session.completed ? "week-bar-done" : distance > 0 ? "week-bar-run" : "week-bar-rest",
    };
  });

  return {
    hasWeekOverview: true,
    weekOverview: {
      title: `第${currentWeek.week}周训练概览`,
      phase: currentWeek.phase || "训练周期",
      plannedKmText: formatKm(plannedKm),
      isEstimated: Boolean(currentWeek.weekly_km_estimated),
      runCountText: `${runSessions.length}次跑步`,
      completedText: `已完成 ${completedCount}/${completableCount || sessions.length}`,
      weeklyKmText: `${currentWeek.weekly_km_estimated ? "约 " : ""}${currentWeek.weekly_km ? formatKm(currentWeek.weekly_km) : formatKm(plannedKm)} km`,
      bars,
    },
  };
}

function buildHomeViewModel(todayTask, targetRaces, currentWeek) {
  const hasTodaySession = !!(todayTask && todayTask.session);
  const hasTodayMessage = !!(todayTask && todayTask.message);
  const session = hasTodaySession ? todayTask.session : {};
  const hasTargetRaces = (targetRaces || []).length > 0;
  const taperReminder = buildTaperReminder(targetRaces);
  const raceHint = buildRaceCountdownHint(targetRaces);
  const weekOverview = buildWeekOverview(currentWeek);
  const distance = normalizeSessionDistance(session);
  const paceText = (session && session.pace) || "";
  const hasTodayDistanceMetric = distance > 0;
  const hasTodayPaceMetric = Boolean(paceText && paceText !== "--");

  return {
    todayTask,
    hasTodaySession,
    hasTodayMessage,
    todaySessionTypeText: (session && session.workout_type) || "恢复训练",
    todaySessionDescText:
      (session && (session.description || session.segment)) || "按计划完成基础训练",
    todayDistanceText:
      session && session.distance_km !== undefined && session.distance_km !== null
        ? `${formatKm(session.distance_km)} km`
        : "无需里程",
    todayDistanceNumber: hasTodayDistanceMetric ? formatKm(distance) : "",
    todayDistanceUnit: hasTodayDistanceMetric ? "km" : "",
    todayPaceText: paceText,
    hasTodayDistanceMetric,
    hasTodayPaceMetric,
    hasTodayMetrics: hasTodayDistanceMetric || hasTodayPaceMetric,
    hasTodaySingleMetric: hasTodayDistanceMetric !== hasTodayPaceMetric,
    todayCompleted: !!(session && session.completed),
    todayCheckinButtonText: session && session.completed ? "取消打卡" : "完成打卡",
    targetRaceMetricText: hasTargetRaces ? `${targetRaces.length}场` : "未设置",
    targetRaces: buildTargetRaceCards(targetRaces),
    hasTargetRaces,
    hasRaceHint: raceHint.hasRaceHint,
    raceHintText: raceHint.raceHintText,
    raceHintName: raceHint.raceHintName,
    raceHintSubtitle: raceHint.raceHintSubtitle,
    raceHintDateText: raceHint.raceHintDateText,
    raceHintDaysText: raceHint.raceHintDaysText,
    showTaperReminder: taperReminder.showTaperReminder,
    taperReminderText: taperReminder.taperReminderText,
    taperReminderRaceName: taperReminder.taperReminderRaceName,
    hasWeekOverview: weekOverview.hasWeekOverview,
    weekOverview: weekOverview.weekOverview,
  };
}

module.exports = {
  buildHomeViewModel,
};
