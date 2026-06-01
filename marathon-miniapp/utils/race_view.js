function pad(value) {
  return String(value).padStart(2, "0");
}

function parseDate(dateStr) {
  const parts = String(dateStr || "").split("-");
  if (parts.length !== 3) {
    return null;
  }
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function formatMonthDay(dateStr) {
  const date = parseDate(dateStr);
  if (!date) {
    return "";
  }
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function monthKey(dateStr) {
  const date = parseDate(dateStr);
  if (!date) {
    return "__unknown";
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function buildMonthOptions(races) {
  const map = {};
  (races || []).forEach((item) => {
    const key = monthKey(item.date);
    if (key) {
      map[key] = true;
    }
  });
  return Object.keys(map)
    .sort((a, b) => {
      if (a === "__unknown") return 1;
      if (b === "__unknown") return -1;
      return a.localeCompare(b);
    })
    .map((key) =>
      key === "__unknown"
        ? { key, label: "待定" }
        : { key, label: `${key.split("-")[0]}/${key.split("-")[1]}` }
    );
}

function buildCalendarCells(month, racesInMonth) {
  if (!month || month === "__unknown") {
    return [];
  }
  const year = Number(month.split("-")[0]);
  const monthNo = Number(month.split("-")[1]);
  if (!year || !monthNo) {
    return [];
  }

  const firstDay = new Date(year, monthNo - 1, 1).getDay();
  const prefix = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, monthNo, 0).getDate();
  const raceCounter = {};

  (racesInMonth || []).forEach((item) => {
    const date = parseDate(item.date);
    if (!date) return;
    const day = date.getDate();
    raceCounter[day] = (raceCounter[day] || 0) + 1;
  });

  const cells = [];
  for (let index = 0; index < prefix; index += 1) {
    cells.push({ day: "", count: 0, empty: true, highlight: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const count = raceCounter[day] || 0;
    cells.push({ day: String(day), count, empty: false, highlight: count > 0 });
  }
  while (cells.length < 42) {
    cells.push({ day: "", count: 0, empty: true, highlight: false });
  }
  return cells;
}

function keywordMatched(race, keyword) {
  if (!keyword) {
    return true;
  }
  const haystack = [
    race.name,
    race.displayDate,
    race.date,
    race.rawDateText,
    race.city,
    race.province,
    race.distance,
    race.level,
    race.registrationStatus,
    race.dateStatus,
    race.sourceName,
    race.sourceUrl,
    race.intro,
    (race.tags || []).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(keyword.toLowerCase());
}

function normalizeDisplayIntro(intro) {
  const text = String(intro || "").trim();
  if (!text || text === "官方信息待补充。" || text === "官方信息待补充") {
    return "";
  }
  return text;
}

function findIndex(options, value) {
  const index = (options || []).findIndex((item) => item === value);
  return index >= 0 ? index : 0;
}

function ensureOption(options, value) {
  if ((options || []).includes(value)) {
    return value;
  }
  return (options || [])[0] || "全部";
}

function withRaceSelection(races, targetIds) {
  const selectedMap = (targetIds || []).reduce((map, id) => {
    map[id] = true;
    return map;
  }, {});
  return (races || []).map((item) => ({
    ...item,
    isTarget: !!selectedMap[item.id],
    displayIntro: normalizeDisplayIntro(item.intro),
    listCountdownText: formatListCountdown(item),
    actionText: selectedMap[item.id] ? "已关注 ✓" : "设为目标",
    actionClass: selectedMap[item.id] ? "race-action-btn race-action-selected" : "race-action-btn",
    compactMetaText: [formatMonthDay(item.date) || item.displayDate, item.city, item.distance].filter(Boolean).join(" · "),
  }));
}

function formatListCountdown(item) {
  if (!item || !item.countdown || item.countdown.isUnknown) {
    return "待定";
  }
  if (item.countdown.isOver) {
    return "已结束";
  }
  const days = Number(item.countdownDays);
  if (!Number.isFinite(days)) {
    return "待定";
  }
  return days <= 0 ? "今日开赛" : `${days}天后`;
}

function buildTargetRaceCards(targetRaces) {
  return (targetRaces || []).map((item) => ({
    ...item,
    displayIntro: normalizeDisplayIntro(item.intro),
    compactMetaText: [formatMonthDay(item.date) || item.displayDate, item.city, item.distance].filter(Boolean).join(" · "),
    compactDaysText:
      item.countdown && !item.countdown.isUnknown && !item.countdown.isOver ? `${item.countdownDays}天` : "待定",
  }));
}

function resolveActiveMonth(months, preferredMonth) {
  if (!months || months.length === 0) {
    return "";
  }
  if (preferredMonth && months.some((item) => item.key === preferredMonth)) {
    return preferredMonth;
  }
  const today = new Date();
  const currentKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
  const currentMatch = months.find((item) => item.key === currentKey);
  if (currentMatch) {
    return currentMatch.key;
  }
  return months[0].key;
}

function buildRaceViewModel(raceService, data) {
  const races = raceService.listRaces();
  const targetRaces = buildTargetRaceCards(raceService.listTargetRaces());
  const targetIds = raceService.getTargetRaceIds();
  const options = raceService.listFilterOptions(races);

  const selectedDistance = ensureOption(options.distanceOptions, data.selectedDistance);
  const selectedStatus = ensureOption(options.statusOptions, data.selectedStatus);
  const selectedCity = ensureOption(options.cityOptions, data.selectedCity);
  const selectedLevel = ensureOption(options.levelOptions, data.selectedLevel);
  const selectedDateStatus = ensureOption(options.dateStatusOptions, data.selectedDateStatus);
  const allRaces = withRaceSelection(races, targetIds);
  const criteriaMatchedRaces = allRaces.filter((item) =>
    keywordMatched(item, data.keyword || "") &&
    (selectedDistance === "全部" || item.distance === selectedDistance) &&
    (selectedStatus === "全部" || item.registrationStatus === selectedStatus) &&
    (selectedCity === "全部" || item.city === selectedCity) &&
    (selectedLevel === "全部" || item.level === selectedLevel) &&
    (selectedDateStatus === "全部" || item.dateStatus === selectedDateStatus)
  );
  const months = buildMonthOptions(criteriaMatchedRaces);
  const activeMonth = resolveActiveMonth(months, data.activeMonth);
  const monthInfo = (months || []).find((item) => item.key === activeMonth);
  const filteredRaces = (criteriaMatchedRaces || []).filter((item) => monthKey(item.date) === activeMonth);
  const calendarCells = buildCalendarCells(activeMonth, filteredRaces);
  const showCalendar = !!activeMonth && activeMonth !== "__unknown";
  const summary = raceService.summarizeRaces(criteriaMatchedRaces);

  return {
    allRaces,
    targetRaces,
    totalMatchedCount: criteriaMatchedRaces.length,
    months,
    activeMonth,
    activeMonthLabel: monthInfo ? monthInfo.label : "--",
    filteredRaces,
    calendarCells,
    showCalendar,
    unverifiedCount: summary.unverifiedCount,
    officialMissingSourceCount: summary.officialMissingSourceCount,
    withSourceCount: summary.withSourceCount,
    distanceOptions: options.distanceOptions,
    statusOptions: options.statusOptions,
    cityOptions: options.cityOptions,
    levelOptions: options.levelOptions,
    dateStatusOptions: options.dateStatusOptions,
    selectedDistance,
    selectedStatus,
    selectedCity,
    selectedLevel,
    selectedDateStatus,
    distanceIndex: findIndex(options.distanceOptions, selectedDistance),
    statusIndex: findIndex(options.statusOptions, selectedStatus),
    cityIndex: findIndex(options.cityOptions, selectedCity),
    levelIndex: findIndex(options.levelOptions, selectedLevel),
    dateStatusIndex: findIndex(options.dateStatusOptions, selectedDateStatus),
  };
}

module.exports = {
  buildRaceViewModel,
};
