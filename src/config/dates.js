function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function formatShort(d) {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  return {
    start: monday,
    end: friday,
    key: formatDate(monday)
  };
}

function formatWeekRangeLabel(weekKey) {
  const monday = new Date(weekKey);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return `${formatShort(monday)} - ${formatShort(friday)}`;
}

module.exports = { getWeekRange, formatDate, formatWeekRangeLabel };
