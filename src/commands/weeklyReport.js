const db = require('../db');
const { getWeekRange, formatWeekRangeLabel } = require('../config/dates');
const { WEEKLY_PLAN_HOURS } = require('../config/planHours');

// /team-report - таблиця за поточний тиждень
// /team-report 2026-09-01 - за конкретний тиждень (ключ = дата понеділка)
function registerTeamReport(app) {
  app.command('/team-report', async ({ ack, respond, command }) => {
    await ack();

    const currentWeek = getWeekRange();
    const weekKey = command.text.trim() || currentWeek.key;
    const weekLabel = formatWeekRangeLabel(weekKey);

    const employees = db.get('employees').value();
    const reports = db.get('reports').filter({ weekKey }).value();

    let totalShortfall = 0;
    let totalHours = 0;

    // Компактна таблиця у monospace-блоці, щоб колонки вирівнювались.
    const rows = employees.map((emp) => {
      const report = reports.find((r) => r.employeeId === emp.slackId);
      const name = emp.name.length > 20 ? emp.name.slice(0, 19) + '…' : emp.name;

      if (!report) {
        totalShortfall += WEEKLY_PLAN_HOURS;
        return `${name.padEnd(21)} не відповів   -${WEEKLY_PLAN_HOURS} год`;
      }

      totalHours += report.totalHours;
      const shortfall = report.shortfallHours ?? Math.max(0, WEEKLY_PLAN_HOURS - report.totalHours);
      totalShortfall += shortfall;

      const hoursStr = `${report.totalHours} год`.padEnd(9);
      const shortfallStr = shortfall > 0 ? `-${shortfall} год` : 'ОК';

      return `${name.padEnd(21)} ${hoursStr} ${shortfallStr}`;
    });

    totalShortfall = Math.round(totalShortfall * 100) / 100;
    totalHours = Math.round(totalHours * 100) / 100;

    const header = `${'ПМ'.padEnd(21)} ${'Часів'.padEnd(9)} Недопрац.`;

    const text =
      `*Звіт за тиждень ${weekLabel}*\n` +
      '```\n' +
      header + '\n' +
      rows.join('\n') +
      `\n\nРазом годин: ${totalHours}\n` +
      `Загалом недопрацьовано: ${totalShortfall} год\n` +
      '```';

    await respond({ text, response_type: 'in_channel' });
  });
}

module.exports = { registerTeamReport };
