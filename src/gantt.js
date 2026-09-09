const GREEN = { bg: '#E1F5EE', text: '#085041' };
const RED = { bg: '#FAECE7', text: '#9B2B0E' };

function dayKey(isoDate) {
  return isoDate.slice(0, 10);
}

function daysBetween(a, b) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function buildGanttData(db) {
  const apps = db.get('apps').value();
  const allProgress = db.get('appProgress').value();
  const employees = db.get('employees').value();

  const employeeName = (slackId) => employees.find((e) => e.slackId === slackId)?.name || slackId;

  if (allProgress.length === 0) {
    return {
      rangeStart: null,
      rangeEnd: null,
      totalDays: 0,
      apps: apps.map((a) => ({ id: a.id, name: a.name, category: a.category, segments: [] }))
    };
  }

  const allDays = allProgress.map((p) => dayKey(p.date)).sort();
  const rangeStart = allDays[0];
  const today = dayKey(new Date().toISOString());
  const rangeEnd = today > allDays[allDays.length - 1] ? today : allDays[allDays.length - 1];
  const totalDays = Math.max(daysBetween(rangeStart, rangeEnd), 1);

  const result = apps.map((appRecord) => {
    const entries = allProgress
      .filter((p) => p.appId === appRecord.id)
      .sort((a, b) => (a.date > b.date ? 1 : -1));

    if (entries.length === 0) {
      return { id: appRecord.id, name: appRecord.name, category: appRecord.category, segments: [] };
    }

    const byDay = {};
    entries.forEach((e) => {
      const d = dayKey(e.date);
      if (!byDay[d]) byDay[d] = { stageId: e.stageId, paused: e.paused, employees: new Set() };
      byDay[d].stageId = e.stageId;
      byDay[d].paused = e.paused;
      byDay[d].employees.add(e.employeeId);
    });

    const days = Object.keys(byDay).sort();
    const segments = days.map((day, idx) => {
      const info = byDay[day];
      const nextDay = idx + 1 < days.length ? days[idx + 1] : rangeEnd;

      const startOffset = daysBetween(rangeStart, day);
      const endOffset = Math.max(daysBetween(rangeStart, nextDay), startOffset + 1);

      const stage = appRecord.stages.find((s) => s.id === info.stageId);
      const color = info.paused ? RED : GREEN;

      return {
        stageName: stage ? stage.name : '—',
        color,
        paused: !!info.paused,
        leftPct: (startOffset / totalDays) * 100,
        widthPct: Math.max(((endOffset - startOffset) / totalDays) * 100, 100 / totalDays),
        employees: Array.from(info.employees).map(employeeName),
        startDay: day
      };
    });

    return { id: appRecord.id, name: appRecord.name, category: appRecord.category, segments };
  });

  return { rangeStart, rangeEnd, totalDays, apps: result };
}

module.exports = { buildGanttData };
