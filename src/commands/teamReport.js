const db = require('../db');
const { getWeekRange } = require('../config/dates');
const { WEEKLY_PLAN_HOURS } = require('../config/planHours');

function registerTeamReport(app) {
  app.command('/team-report', async ({ ack, respond, command }) => {
    await ack();

    const currentWeek = getWeekRange();
    const weekKey = command.text.trim() || currentWeek.key;

    const employees = db.get('employees').value();
    const tasks = db.get('tasks').value();
    const reports = db.get('reports').filter({ weekKey }).value();

    let totalShortfall = 0;
    const blocks = [];

    employees.forEach((emp) => {
      const report = reports.find((r) => r.employeeId === emp.slackId);

      if (!report) {
        totalShortfall += WEEKLY_PLAN_HOURS;
        blocks.push(`*${emp.name}* — не відповів(ла)  _(-${WEEKLY_PLAN_HOURS} год до плану)_`);
        return;
      }

      const lines = [`*${emp.name}*`];

      report.taskResults.forEach((tr) => {
        const task = tasks.find((t) => t.id === tr.taskId);
        const taskText = task ? task.text : 'Завдання';
        const doneMark = tr.done === 'yes' ? '✅' : '❌';
        lines.push(`  ${doneMark} ${taskText} — ${tr.hours} год${tr.reason ? ` (${tr.reason})` : ''}`);
      });

      (report.extraTasks || []).forEach((et) => {
        lines.push(`  • ${et.name} — ${et.hours} год`);
      });

      lines.push(`  Разом: *${report.totalHours} год*`);

      if (report.shortfallHours > 0) {
        lines.push(`  Недопрацьовано: *${report.shortfallHours} год*`);
        totalShortfall += report.shortfallHours;
      } else {
        lines.push('  План виконано ✅');
      }

      blocks.push(lines.join('\n'));
    });

    totalShortfall = Math.round(totalShortfall * 100) / 100;

    const text =
      `*Звіт за тиждень ${weekKey}*\n\n` +
      blocks.join('\n\n') +
      `\n\n*Загалом недопрацьовано на всіх: ${totalShortfall} год*`;

    await respond({ text, response_type: 'in_channel' });
  });
}

module.exports = { registerTeamReport };
