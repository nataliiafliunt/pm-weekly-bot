const db = require('../db');
const { getWeekRange, formatWeekRangeLabel } = require('../config/dates');
const { WEEKLY_PLAN_HOURS } = require('../config/planHours');
const { formatHoursDisplay } = require('../utils/parseHours');

function buildCsv(rows) {
  const header = ['ПМ', 'Години', 'Недопрацьовані години', 'Пріоритетні завдання', 'Причина невиконання'];
  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [header.map(escape).join(',')];
  rows.forEach((r) => {
    lines.push([r.name, r.hoursRaw, r.shortfallRaw, r.priorityTasksText, r.reason].map(escape).join(','));
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
    const rowsData = [];

    employees.forEach((emp) => {
      const report = reports.find((r) => r.employeeId === emp.slackId);

      if (!report) {
        totalShortfall += WEEKLY_PLAN_HOURS;
        rowsData.push({
          name: emp.name,
          hoursRaw: 0,
          hoursDisplay: '-',
          shortfallRaw: WEEKLY_PLAN_HOURS,
          shortfallDisplay: formatHoursDisplay(WEEKLY_PLAN_HOURS),
          priorityTasksText: '-',
          reason: 'Опитування не пройдено',
          responded: false
        });
        return;
      }

      totalHours += report.totalHours;
      const shortfall = report.shortfallHours ?? Math.max(0, WEEKLY_PLAN_HOURS - report.totalHours);
      totalShortfall += shortfall;

      // Пріоритетні завдання - ті, що назначені через /task-add (можуть бути
      // декілька за тиждень). Показуємо кожне окремо зі своїм статусом,
      // а не одне загальне так/ні.
      let priorityTasksText = '-';
      let reason = '-';
      if (report.taskResults.length > 0) {
        priorityTasksText = report.taskResults
          .map((tr) => {
            const task = tasks.find((t) => t.id === tr.taskId);
            const label = task ? task.text : 'Завдання';
            const shortLabel = label.length > 30 ? label.slice(0, 29) + '…' : label;
            return `${shortLabel}: ${tr.done === 'yes' ? 'Так' : 'Ні'}`;
          })
          .join('; ');

        const reasons = report.taskResults
          .filter((t) => t.done === 'no' && t.reason)
          .map((t) => t.reason);
        if (reasons.length > 0) reason = reasons.join('; ');
      }

      rowsData.push({
        name: emp.name,
        hoursRaw: report.totalHours,
        hoursDisplay: formatHoursDisplay(report.totalHours),
        shortfallRaw: shortfall,
        shortfallDisplay: shortfall > 0 ? formatHoursDisplay(shortfall) : '-',
        priorityTasksText,
        reason,
        responded: true
      });
    });

    totalShortfall = Math.round(totalShortfall * 100) / 100;
    totalHours = Math.round(totalHours * 100) / 100;

    const nameW = 22;
    const hoursW = 14;
    const shortW = 24;
    const prioW = 34;

    const pad = (s, w) => String(s).padEnd(w);
    const header = `${pad('ПМ', nameW)} ${pad('Години', hoursW)} ${pad('Недопрацьовані години', shortW)} ${pad('Пріоритетні завдання', prioW)} Причина невиконання`;

    const lines = rowsData.map((r) => {
      return `${pad(r.name, nameW)} ${pad(r.hoursDisplay, hoursW)} ${pad(r.shortfallDisplay, shortW)} ${pad(r.priorityTasksText, prioW)} ${r.reason}`;
    });

    const text =
      `*Звіт за тиждень ${weekLabel}*\n` +
      '```\n' +
      header + '\n' +
      lines.join('\n') +
      `\n\nРазом годин: ${formatHoursDisplay(totalHours)}\n` +
      `Загалом недопрацьовано: ${formatHoursDisplay(totalShortfall)}\n` +
      '```';

    await respond({ text, response_type: 'in_channel' });

    // Файл шлемо в особисті тому, хто викликав команду (не в канал -
    // бот може не мати прав вантажити файли прямо в довільний канал).
    try {
      const csv = buildCsv(rowsData);
      await client.files.uploadV2({
        channel_id: command.user_id,
        filename: `zvit_${weekKey}.csv`,
        content: csv,
        initial_comment: `Звіт за тиждень ${weekLabel} у форматі файлу`
      });
    } catch (err) {
      console.error('Не вдалося завантажити файл звіту:', err.message);
    }
  });
}

module.exports = { registerTeamReport };
