function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function formatShort(d) {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToTuesday = (day - 2 + 7) % 7;

  const tuesday = new Date(d);
  tuesday.setDate(d.getDate() - diffToTuesday);
  tuesday.setHours(0, 0, 0, 0);

  const nextMonday = new Date(tuesday);
  nextMonday.setDate(tuesday.getDate() + 6);

  return {
    start: tuesday,
    end: nextMonday,
    key: formatDate(tuesday)
  };
}

function formatWeekRangeLabel(weekKey) {
  const start = new Date(weekKey);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${formatShort(start)} - ${formatShort(end)}`;
}

module.exports = { getWeekRange, formatDate, formatWeekRangeLabel };
