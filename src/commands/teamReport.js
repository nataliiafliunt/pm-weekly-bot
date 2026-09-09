const db = require('../db');
const { getWeekRange, formatWeekRangeLabel } = require('../config/dates');
const { WEEKLY_PLAN_HOURS } = require('../config/planHours');
const { formatHoursDisplay } = require('../utils/parseHours');

// Будує колонки динамічно - стільки блоків "Пріоритетне N" і "Завдання N",
// скільки максимум завдань у будь-кого цього тижня. Використовується і для
// тексту в чаті, і для CSV-файлу - структура однакова, щоб не було розбіжностей.
function buildColumns(rowsData, maxPriority, maxExtra) {
  const columns = [
    { key: 'name', label: 'ПМ', width: 16 },
    { key: 'hoursDisplay', label: 'Всього годин', width: 13 },
    { key: 'shortfallDisplay', label: 'Недопрац.', width: 11 }
  ];

  for (let i = 1; i <= maxPriority; i += 1) {
    columns.push({ key: `p${i}_name`, label: `Пріоритетне ${i}`, width: 18 });
    columns.push({ key: `p${i}_plan`, label: `План ${i}`, width: 7 });
    columns.push({ key: `p${i}_fact`, label: `Факт ${i}`, width: 7 });
    columns.push({ key: `p${i}_reason`, label: `Причина ${i}`, width: 16 });
  }
  for (let i = 1; i <= maxExtra; i += 1) {
    columns.push({ key: `e${i}_name`, label: `Завдання ${i}`, width: 18 });
    columns.push({ key: `e${i}_hours`, label: `Год ${i}`, width: 7 });
  }

  return columns;
}

function rowToFlat(r, maxPriority, maxExtra) {
  const flat = { name: r.name, hoursDisplay: r.hoursDisplay, shortfallDisplay: r.shortfallDisplay };
  for (let i = 0; i < maxPriority; i += 1) {
    const p = r.priorityTasks[i];
    flat[`p${i + 1}_name`] = p ? p.name : '-';
    flat[`p${i + 1}_plan`] = p ? p.planDisplay : '-';
    flat[`p${i + 1}_fact`] = p ? p.factDisplay : '-';
    flat[`p${i + 1}_reason`] = p ? p.reason : '-';
  }
  for (let i = 0; i < maxExtra; i += 1) {
    const e = r.extraTasks[i];
    flat[`e${i + 1}_name`] = e ? e.name : '-';
    flat[`e${i + 1}_hours`] = e ? e.hoursDisplay : '-';
  }
  return flat;
}

function buildTableText(rowsData, columns, maxPriority, maxExtra) {
  const pad = (s, w) => String(s).padEnd(w);
  const header = columns.map((c) => pad(c.label, c.width)).join(' ');
  const lines = rowsData.map((r) => {
    const flat = rowToFlat(r, maxPriority, maxExtra);
    return columns.map((c) => pad(flat[c.key], c.width)).join(' ');
  });
  return { header, lines };
}

function buildCsv(rowsData, maxPriority, maxExtra) {
  const columns = buildColumns(rowsData, maxPriority, maxExtra);
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [columns.map((c) => escape(c.label)).join(',')];
  rowsData.forEach((r) => {
    const flat = rowToFlat(r, maxPriority, maxExtra);
    lines.push(columns.map((c) => escape(flat[c.key])).join(','));
  });
  return lines.join('\n');
}

function registerTeamReport(app) {
  app.command('/team-report', async ({ ack, respond, command, client }) => {
    await ack();

    const currentWeek = getWeekRange();
    const weekKey = command.text.trim() || currentWeek.key;
    const weekLabel = formatWeekRangeLabel(weekKey);

    const employees = db.get('employees').value();
    const tasks = db.get('tasks').value();
    const reports = db.get('reports').filter({ weekKey }).value();

    let totalShortfall = 0;
    let totalHours = 0;
    let priorityDiffMinutes = 0;
    const rowsData = [];

    employees.forEach((emp) => {
      const report = reports.find((r) => r.employeeId === emp.slackId);

      if (!report) {
        totalShortfall += WEEKLY_PLAN_HOURS;
        rowsData.push({
          name: emp.name,
          hoursDisplay: 'не відповів(ла)',
          shortfallDisplay: formatHoursDisplay(WEEKLY_PLAN_HOURS),
          priorityTasks: [],
          extraTasks: [],
          responded: false
        });
        return;
      }

      totalHours += report.totalHours;
      const shortfall = report.shortfallHours ?? Math.max(0, WEEKLY_PLAN_HOURS - report.totalHours);
      totalShortfall += shortfall;

      const priorityTasks = report.taskResults.map((tr) => {
        const task = tasks.find((t) => t.id === tr.taskId);
        const planHours = task ? task.hours : 0;
        priorityDiffMinutes += Math.round((tr.hours - planHours) * 60);
        return {
          name: task ? task.text : 'Завдання',
          planDisplay: formatHoursDisplay(planHours),
          factDisplay: formatHoursDisplay(tr.hours),
          done: tr.done,
          reason: tr.done === 'no' ? tr.reason || '-' : '-'
        };
      });

      const extraTasks = (report.extraTasks || []).map((et) => ({
        name: et.name,
        hoursDisplay: formatHoursDisplay(et.hours)
      }));

      rowsData.push({
        name: emp.name,
        hoursDisplay: formatHoursDisplay(report.totalHours),
        shortfallDisplay: shortfall > 0 ? formatHoursDisplay(shortfall) : '-',
        priorityTasks,
        extraTasks,
        responded: true
      });
    });

    totalShortfall = Math.round(totalShortfall * 100) / 100;
    totalHours = Math.round(totalHours * 100) / 100;

    const maxPriority = Math.max(0, ...rowsData.map((r) => r.priorityTasks.length));
    const maxExtra = Math.max(0, ...rowsData.map((r) => r.extraTasks.length));

    const columns = buildColumns(rowsData, maxPriority, maxExtra);
    const { header, lines } = buildTableText(rowsData, columns, maxPriority, maxExtra);

    const diffText =
      priorityDiffMinutes === 0
        ? '0 хв'
        : `${priorityDiffMinutes > 0 ? '+' : '-'}${formatHoursDisplay(Math.abs(priorityDiffMinutes) / 60)}`;

    const text =
      `*Звіт по відділу ПМ за тиждень ${weekLabel}*\n` +
      '```\n' +
      header + '\n' +
      lines.join('\n') +
      `\n\nРазом годин по відділу ПМ: ${formatHoursDisplay(totalHours)}\n` +
      `Загалом недопрацьовано по відділу ПМ: ${formatHoursDisplay(totalShortfall)}\n` +
      `Різниця план/факт по пріоритетних завданнях: ${diffText}\n` +
      '```';

    await respond({ text, response_type: 'in_channel' });

    try {
      const csv = buildCsv(rowsData, maxPriority, maxExtra);
      const dm = await client.conversations.open({ users: command.user_id });
      await client.files.uploadV2({
        channel_id: dm.channel.id,
        filename: `zvit_${weekKey}.csv`,
        content: csv,
        initial_comment: `Детальний звіт по відділу ПМ за тиждень ${weekLabel} (той самий, що і в таблиці вище, файлом)`
      });
    } catch (err) {
      console.error('Не вдалося завантажити файл звіту:', err.message);
    }
  });
}

module.exports = { registerTeamReport };
