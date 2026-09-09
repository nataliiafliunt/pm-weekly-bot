const db = require('../db');
const { getWeekRange, formatWeekRangeLabel } = require('../config/dates');
const { WEEKLY_PLAN_HOURS } = require('../config/planHours');
const { formatHoursDisplay } = require('../utils/parseHours');

function buildCsv(rows) {
  const header = ['ПМ', 'Години', 'Недопрацьовані години', "Обов'язкове завдання", 'Причина невиконання'];
  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [header.map(escape).join(',')];
  rows.forEach((r) => {
    lines.push([r.name, r.hoursRaw, r.shortfallRaw, r.mandatory, r.reason].map(escape).join(','));
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
          mandatory: '-',
          reason: 'Опитування не пройдено',
          responded: false
        });
        return;
      }

      totalHours += report.totalHours;
      const shortfall = report.shortfallHours ?? Math.max(0, WEEKLY_PLAN_HOURS - report.totalHours);
      totalShortfall += shortfall;

      let mandatory = '-';
      let reason = '-';
      if (report.taskResults.length > 0) {
        const allDone = report.taskResults.every((t) => t.done === 'yes');
        mandatory = allDone ? 'Так' : 'Ні';
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
        mandatory,
        reason,
        responded: true
      });
    });

    totalShortfall = Math.round(totalShortfall * 100) / 100;
    totalHours = Math.round(totalHours * 100) / 100;

    const nameW = 20;
    const hoursW = 12;
    const shortW = 12;
    const mandW = 11;

    const pad = (s, w) => String(s).padEnd(w);
    const header = `${pad('ПМ', nameW)} ${pad('Години', hoursW)} ${pad('Недопрац.', shortW)} ${pad("Обов'язк.", mandW)} Причина`;

    const lines = rowsData.map((r) => {
      const name = r.name.length > nameW - 1 ? r.name.slice(0, nameW - 2) + '…' : r.name;
      return `${pad(name, nameW)} ${pad(r.hoursDisplay, hoursW)} ${pad(r.shortfallDisplay, shortW)} ${pad(r.mandatory, mandW)} ${r.reason}`;
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

    // Файл для завантаження - повна версія у CSV, можна відкрити в Excel/Google Sheets
    try {
      const csv = buildCsv(rowsData);
      await client.files.uploadV2({
        channel_id: command.channel_id,
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
