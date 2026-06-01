function toDate(dateLike) {
  if (!dateLike) {
    return new Date();
  }
  if (dateLike instanceof Date) {
    return dateLike;
  }
  return new Date(`${dateLike}T00:00:00`);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDate(dateLike = new Date()) {
  const date = toDate(dateLike);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateCN(dateLike = new Date()) {
  const date = toDate(dateLike);
  return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日`;
}

function daysBetween(start, end) {
  const startDate = toDate(start);
  const endDate = toDate(end);
  const diff = endDate.getTime() - startDate.getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

function daysUntil(dateLike) {
  const today = formatDate(new Date());
  return daysBetween(today, formatDate(dateLike));
}

function getMondayIndex(dateLike = new Date()) {
  const day = toDate(dateLike).getDay();
  return day === 0 ? 7 : day;
}

module.exports = {
  formatDate,
  formatDateCN,
  daysBetween,
  daysUntil,
  getMondayIndex,
};
