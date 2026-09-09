function hoursMinutesToHours(hoursVal, minutesVal) {
  const h = parseInt(hoursVal, 10) || 0;
  const m = parseInt(minutesVal, 10) || 0;
  return Math.round((h + m / 60) * 100) / 100;
}

module.exports = { hoursMinutesToHours };
