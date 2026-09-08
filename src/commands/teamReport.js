const db = require('../db');
const { getWeekRange } = require('../config/dates');

// /team-report - сводка за текущую неделю
// /team-report 2026-09-01 - сводка за конкретную неделю (ключ = дата понедельника)
function registerTeamReport(app) {
  app.command('/team-report', async ({ ack, respond, command }) => {
    await ack();

    const currentWeek = getWeekRange();
    const weekKey = command.text.trim() || currentWeek.key;

    const employees = db.get('employees').value();
    const reports = db.get('reports').filter({ weekKey }).value();

    let totalAll = 0;
    const rows = employees.map((emp) => {
      const report = reports.find((r) => r.employeeId === emp.slackId);

      if (!report) {
        return `${emp.name.padEnd(15)} не відповів(ла)`;
      }

      totalAll += report.totalHours;

      let status = '—';
      if (report.taskResults.length > 0) {
        const allDone = report.taskResults.every((t) => t.done === 'yes');
        status = allDone ? 'виконано' : 'не все виконано';
      }

      return `${emp.name.padEnd(15)} ${status.padEnd(18)} ${report.totalHours} год`;
    });

    totalAll = Math.round(totalAll * 10) / 10;

    const text =
      `*Звіт за тиждень ${weekKey}*\n` +
      '```\n' +
      rows.join('\n') +
      `\n\nРазом: ${totalAll} год\n` +
      '```';

    await respond({ text, response_type: 'in_channel' });
  });
}

module.exports = { registerTeamReport };
