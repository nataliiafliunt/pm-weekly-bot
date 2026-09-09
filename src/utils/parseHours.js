function hoursMinutesToHours(hoursVal, minutesVal) {
  const h = parseInt(hoursVal, 10) || 0;
  const m = parseInt(minutesVal, 10) || 0;
  return Math.round((h + m / 60) * 100) / 100;
}

function formatHoursDisplay(hoursDecimal) {
  const totalMinutes = Math.round((hoursDecimal || 0) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h === 0 && m === 0) return '0 хв';
  if (h === 0) return `${m} хв`;
  if (m === 0) return `${h} год`;
  return `${h} год ${m} хв`;
}

module.exports = { hoursMinutesToHours, formatHoursDisplay };
