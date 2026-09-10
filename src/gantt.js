// Перетворює appProgress (факт) і appPlan (план) в непрервні сегменти для
// таймлайну, з точністю до дня. Кожен додаток тепер має ДВА ряди:
// "Факт" (зелений/червоний, як і раніше) та "План" (нейтральний колір,
// по одному сегменту на кожен запланований тиждень).

const GREEN = { bg: '#E1F5EE', text: '#085041' };
const RED = { bg: '#FAECE7', text: '#9B2B0E' };
const PLAN_COLOR = { bg: '#EEEDFE', text: '#3C3489' };

function dayKey(isoDate) {
  return isoDate.slice(0, 10);
}

function daysBetween(a, b) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function addDays(dayStr, n) {
  const d = new Date(dayStr);
  d.setDate(d.getDate() + n);
  return dayKey(d.toISOString());
}

function buildGanttData(db) {
  const apps = db.get('apps').value();
  const allProgress = db.get('appProgress').value();
  const allPlans = db.get('appPlan').value();
  const employees = db.get('employees').value();

  const employeeName = (slackId) => employees.find((e) => e.slackId === slackId)?.name || slackId;

  if (allProgress.length === 0 && allPlans.length === 0) {
    return {
      rangeStart: null,
      rangeEnd: null,
      totalDays: 0,
      apps: apps.map((a) => ({ id: a.id, name: a.name, category: a.category, segments: [], planSegments: [] }))
    };
  }

  const actualDays = allProgress.map((p) => dayKey(p.date));
  const planWeekEnds = allPlans.map((p) => addDays(p.weekKey, 6));
  const allKnownDays = [...actualDays, ...allPlans.map((p) => p.weekKey), ...planWeekEnds];

  const today = dayKey(new Date().toISOString());
  const sorted = allKnownDays.concat(today).sort();
  const rangeStart = sorted[0];
  const rangeEnd = sorted[sorted.length - 1];
  const totalDays = Math.max(daysBetween(rangeStart, rangeEnd), 1);

  const result = apps.map((appRecord) => {
    // ---- Факт (як і раніше) ----
    const entries = allProgress
      .filter((p) => p.appId === appRecord.id)
      .sort((a, b) => (a.date > b.date ? 1 : -1));

    let segments = [];
    if (entries.length > 0) {
      const byDay = {};
      entries.forEach((e) => {
        const d = dayKey(e.date);
        if (!byDay[d]) byDay[d] = { stageId: e.stageId, paused: e.paused, employees: new Set() };
        byDay[d].stageId = e.stageId;
        byDay[d].paused = e.paused;
        byDay[d].employees.add(e.employeeId);
      });

      const days = Object.keys(byDay).sort();
      segments = days.map((day, idx) => {
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
    }

    // ---- План - один сегмент на кожен запланований тиждень ----
    const plans = allPlans
      .filter((p) => p.appId === appRecord.id)
      .sort((a, b) => (a.weekKey > b.weekKey ? 1 : -1));

    const planSegments = plans.map((p) => {
      const stage = appRecord.stages.find((s) => s.id === p.stageId);
      const weekEnd = addDays(p.weekKey, 6);
      const startOffset = daysBetween(rangeStart, p.weekKey);
      const endOffset = daysBetween(rangeStart, weekEnd) + 1;

      return {
        stageName: stage ? stage.name : '—',
        color: PLAN_COLOR,
        leftPct: (startOffset / totalDays) * 100,
        widthPct: Math.max(((endOffset - startOffset) / totalDays) * 100, 100 / totalDays),
        weekKey: p.weekKey
      };
    });

    return {
      id: appRecord.id,
      name: appRecord.name,
      category: appRecord.category,
      assignees: (appRecord.assignees || []).map(employeeName),
      segments,
      planSegments
    };
  });

  return { rangeStart, rangeEnd, totalDays, apps: result };
}

module.exports = { buildGanttData };
