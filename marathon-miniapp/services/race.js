const races = require("../data/races");
const { KEYS, get, set } = require("../utils/storage");
const { formatDate } = require("../utils/date");

const OPTION_ALL = "全部";
const DATE_STATUS_CONFIRMED = "已确认";
const DATE_STATUS_PENDING = "待核实";
const REG_STATUS_OPEN = "报名中";
const REG_STATUS_SOON = "即将报名";
const REG_STATUS_CLOSED = "报名截止";
const REG_STATUS_ENDED = "已结束";
const REG_STATUS_UNKNOWN = "待公布";

function compareDate(a, b) {
  if (!a && !b) {
    return 0;
  }
  if (!a) {
    return 1;
  }
  if (!b) {
    return -1;
  }
  return a === b ? 0 : a > b ? 1 : -1;
}

function parseRaceDateTime(dateStr, startTime) {
  const dateText = String(dateStr || "").trim();
  if (!dateText) {
    return null;
  }
  const timeText = String(startTime || "").trim();
  const normalizedTime = /^\d{2}:\d{2}$/.test(timeText) ? timeText : "00:00";
  const parsed = new Date(`${dateText}T${normalizedTime}:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function calculateCountdown(dateStr, startTime) {
  const targetDate = parseRaceDateTime(dateStr, startTime);
  if (!targetDate) {
    return {
      isUnknown: true,
      isOver: false,
      totalMinutes: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      text: "待公布",
      shortText: "待定",
    };
  }

  const now = new Date();
  let diffMinutes = Math.floor((targetDate.getTime() - now.getTime()) / 60000);
  if (diffMinutes <= 0) {
    return {
      isUnknown: false,
      isOver: true,
      totalMinutes: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      text: "已结束",
      shortText: "已结束",
    };
  }

  const days = Math.floor(diffMinutes / (24 * 60));
  diffMinutes -= days * 24 * 60;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes - hours * 60;

  return {
    isUnknown: false,
    isOver: false,
    totalMinutes: days * 24 * 60 + hours * 60 + minutes,
    days,
    hours,
    minutes,
    text: `${days}天${hours}时${minutes}分`,
    shortText: `${days}天${hours}时`,
  };
}

function normalizeDateStatus(value) {
  const text = String(value || "").trim();
  if (!text) {
    return DATE_STATUS_PENDING;
  }
  if (/^(已确认|已官宣|官宣|已确定|confirmed)$/i.test(text)) {
    return DATE_STATUS_CONFIRMED;
  }
  if (/^(待核实|待确认|待公布|未官宣|pending|tbc)$/i.test(text)) {
    return DATE_STATUS_PENDING;
  }
  return text;
}

function getRegistrationStatus(item, today) {
  if (item.countdown.isUnknown) {
    return REG_STATUS_UNKNOWN;
  }
  if (item.countdown.isOver) {
    return REG_STATUS_ENDED;
  }

  const hasOpen = !!item.registrationOpen;
  const hasClose = !!item.registrationClose;
  if (!hasOpen || !hasClose) {
    return REG_STATUS_UNKNOWN;
  }

  if (compareDate(today, item.registrationOpen) < 0) {
    return REG_STATUS_SOON;
  }
  if (compareDate(today, item.registrationClose) > 0) {
    return REG_STATUS_CLOSED;
  }
  return REG_STATUS_OPEN;
}

function buildRegistrationWindowText(item) {
  if (!item.registrationOpen || !item.registrationClose) {
    return "报名时间待公布";
  }
  return `${item.registrationOpen} ~ ${item.registrationClose}`;
}

function getStatusClass(status) {
  const map = {
    [REG_STATUS_OPEN]: "status-open",
    [REG_STATUS_SOON]: "status-soon",
    [REG_STATUS_CLOSED]: "status-close",
    [REG_STATUS_ENDED]: "status-ended",
    [REG_STATUS_UNKNOWN]: "status-unknown",
  };
  return map[status] || "status-unknown";
}

function getDateStatusClass(dateStatus) {
  if (dateStatus === DATE_STATUS_CONFIRMED) {
    return "date-confirmed";
  }
  if (dateStatus === DATE_STATUS_PENDING) {
    return "date-pending";
  }
  return "date-other";
}

function getSourceState(dateStatus, sourceUrl) {
  const hasSource = !!sourceUrl;
  if (dateStatus === DATE_STATUS_CONFIRMED && !hasSource) {
    return "缺少官宣链接";
  }
  return hasSource ? "已附来源" : "未附来源";
}

function getSourceStateClass(sourceState) {
  const map = {
    已附来源: "source-ok",
    未附来源: "source-empty",
    缺少官宣链接: "source-missing",
  };
  return map[sourceState] || "source-empty";
}

function buildSourceText(item) {
  const sourceName = String(item.sourceName || "").trim();
  const sourceUrl = String(item.sourceUrl || "").trim();
  if (sourceName && sourceUrl) {
    return `${sourceName} · ${sourceUrl}`;
  }
  if (sourceName) {
    return sourceName;
  }
  if (sourceUrl) {
    return sourceUrl;
  }
  return "未提供来源";
}

function calculateTrainingWeeks(countdown) {
  if (!countdown || countdown.isUnknown || countdown.isOver) {
    return 0;
  }
  const dayBase = countdown.days + (countdown.hours > 0 || countdown.minutes > 0 ? 1 : 0);
  return Math.max(1, Math.ceil(dayBase / 7));
}

function normalizeDisplayDate(date, rawDateText) {
  if (date) {
    return date;
  }
  const raw = String(rawDateText || "").trim();
  if (raw) {
    return raw;
  }
  return "待公布";
}

function enrichRace(item, today) {
  const countdown = calculateCountdown(item.date, item.startTime);
  const registrationStatus = getRegistrationStatus(
    Object.assign({}, item, {
      countdown,
    }),
    today
  );
  const dateStatus = normalizeDateStatus(item.dateStatus);
  const sourceUrl = String(item.sourceUrl || "").trim();
  const sourceState = getSourceState(dateStatus, sourceUrl);
  const trainingWeeks = calculateTrainingWeeks(countdown);
  const displayDate = normalizeDisplayDate(item.date, item.rawDateText);

  return Object.assign({}, item, {
    displayDate,
    countdown,
    countdownDays: countdown.isUnknown ? "--" : countdown.days,
    countdownHours: countdown.isUnknown ? "--" : countdown.hours,
    countdownMinutes: countdown.isUnknown ? "--" : countdown.minutes,
    countdownText: countdown.text,
    countdownShortText: countdown.shortText,
    registrationStatus,
    registrationWindowText: buildRegistrationWindowText(item),
    statusClass: getStatusClass(registrationStatus),
    dateStatus,
    dateStatusClass: getDateStatusClass(dateStatus),
    sourceUrl,
    sourceState,
    sourceStateClass: getSourceStateClass(sourceState),
    sourceText: buildSourceText(item),
    isDateUnverified: !item.date,
    trainingWeeks,
    trainingWeeksText: countdown.isUnknown
      ? "日期待定"
      : countdown.isOver
      ? "已开赛"
      : `约 ${trainingWeeks} 周训练时间`,
  });
}

function listRaces() {
  const today = formatDate(new Date());
  return races
    .map((item) => enrichRace(item, today))
    .sort((a, b) => {
      const dateSort = compareDate(a.date, b.date);
      if (dateSort !== 0) {
        return dateSort;
      }
      return String(a.name || "").localeCompare(String(b.name || ""), "zh-Hans-CN");
    });
}

function summarizeRaces(raceList = listRaces()) {
  const hasSourceMeta = (raceList || []).some((item) => item.sourceUrl || item.sourceName);
  return raceList.reduce(
    (summary, item) => {
      summary.total += 1;
      if (item.isDateUnverified) {
        summary.unverifiedCount += 1;
      }
      if (hasSourceMeta && item.dateStatus === DATE_STATUS_CONFIRMED && !item.sourceUrl) {
        summary.officialMissingSourceCount += 1;
      }
      if (item.sourceUrl) {
        summary.withSourceCount += 1;
      }
      return summary;
    },
    {
      total: 0,
      unverifiedCount: 0,
      officialMissingSourceCount: 0,
      withSourceCount: 0,
    }
  );
}

function listFilterOptions(raceList = listRaces()) {
  const pickUnique = (key) =>
    Array.from(
      raceList.reduce((set, item) => {
        const value = item[key];
        if (value) {
          set.add(value);
        }
        return set;
      }, new Set())
    );

  const distanceOptions = [OPTION_ALL].concat(pickUnique("distance"));
  const statusOptions = [OPTION_ALL].concat(pickUnique("registrationStatus"));
  const levelOptions = [OPTION_ALL].concat(pickUnique("level").sort((a, b) => a.localeCompare(b, "zh-Hans-CN")));
  const cityOptions = [OPTION_ALL].concat(pickUnique("city").sort((a, b) => a.localeCompare(b, "zh-Hans-CN")));
  const dateStatusOptions = [OPTION_ALL].concat(
    pickUnique("dateStatus").sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))
  );

  return {
    distanceOptions,
    statusOptions,
    levelOptions,
    cityOptions,
    dateStatusOptions,
  };
}

function normalizeTargetRaceIds(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof rawValue === "string") {
    const id = rawValue.trim();
    return id ? [id] : [];
  }
  return [];
}

function unique(ids) {
  const map = {};
  const result = [];
  (ids || []).forEach((id) => {
    if (!id || map[id]) {
      return;
    }
    map[id] = true;
    result.push(id);
  });
  return result;
}

function getTargetRaceIds() {
  const rawIds = get(KEYS.TARGET_RACE_IDS, []);
  const legacyId = get(KEYS.TARGET_RACE_ID, "");
  const merged = unique(normalizeTargetRaceIds(rawIds).concat(normalizeTargetRaceIds(legacyId)));

  const raceMap = listRaces().reduce((map, item) => {
    map[item.id] = true;
    return map;
  }, {});

  const validIds = merged.filter((id) => raceMap[id]);
  if (validIds.length !== merged.length) {
    set(KEYS.TARGET_RACE_IDS, validIds);
  }
  if ((legacyId || "") !== (validIds[0] || "")) {
    set(KEYS.TARGET_RACE_ID, validIds[0] || "");
  }
  return validIds;
}

function saveTargetRaceIds(ids) {
  const normalized = unique(normalizeTargetRaceIds(ids));
  set(KEYS.TARGET_RACE_IDS, normalized);
  set(KEYS.TARGET_RACE_ID, normalized[0] || "");
  return normalized;
}

function listTargetRaces() {
  const targetIds = getTargetRaceIds();
  if (!targetIds.length) {
    return [];
  }
  const raceMap = listRaces().reduce((map, item) => {
    map[item.id] = item;
    return map;
  }, {});
  return targetIds
    .map((id) => raceMap[id])
    .filter(Boolean)
    .sort((a, b) => compareDate(a.date, b.date));
}

function addTargetRace(raceId) {
  const id = String(raceId || "").trim();
  if (!id) {
    return false;
  }
  const ids = getTargetRaceIds();
  if (ids.includes(id)) {
    return false;
  }
  saveTargetRaceIds(ids.concat(id));
  return true;
}

function removeTargetRace(raceId) {
  const id = String(raceId || "").trim();
  if (!id) {
    return false;
  }
  const ids = getTargetRaceIds();
  if (!ids.includes(id)) {
    return false;
  }
  saveTargetRaceIds(ids.filter((item) => item !== id));
  return true;
}

function toggleTargetRace(raceId) {
  const id = String(raceId || "").trim();
  if (!id) {
    return false;
  }
  const ids = getTargetRaceIds();
  if (ids.includes(id)) {
    removeTargetRace(id);
    return false;
  }
  addTargetRace(id);
  return true;
}

function setTargetRace(raceId) {
  const id = String(raceId || "").trim();
  if (!id) {
    clearTargetRaces();
    return;
  }
  saveTargetRaceIds([id]);
}

function getTargetRace() {
  const targetRaces = listTargetRaces();
  return targetRaces.length > 0 ? targetRaces[0] : null;
}

function clearTargetRaces() {
  saveTargetRaceIds([]);
}

function clearTargetRace() {
  clearTargetRaces();
}

module.exports = {
  listRaces,
  listTargetRaces,
  summarizeRaces,
  listFilterOptions,
  getTargetRaceIds,
  addTargetRace,
  removeTargetRace,
  toggleTargetRace,
  setTargetRace,
  getTargetRace,
  clearTargetRace,
  clearTargetRaces,
};
