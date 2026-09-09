const db = require('../db');
const { getWeekRange, formatWeekRangeLabel } = require('../config/dates');
const { WEEKLY_PLAN_HOURS } = require('../config/planHours');
const { formatHoursDisplay } = require('../utils/parseHours');

// Будує CSV з динамічною кількістю колонок - стільки блоків "Пріоритетне N"
// і "Завдання N", скільки максимум завдань у будь-кого цього тижня.
function buildCsv(rowsData, maxPriority, maxExtra) {
  const header = ['ПМ', 'Всього годин', 'Недопрацьовано'];
  for (let i = 1; i <= maxPriority; i += 1) {
    header.push(`Пріоритетне ${i}: Назва`, `План ${i}`, `Факт ${i}`, `Причина ${i}`);
  }
  for (let i = 1; i <= maxExtra; i += 1) {
    header.push(`Завдання ${i}: Назва`, `Год ${i}`);
  }

  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [header.map(escape).join(',')];

  rowsData.forEach((r) => {
    const row = [r.name, r.hoursDisplay, r.shortfallDisplay];
    for (let i = 0; i < maxPriority; i += 1) {
      const p = r.priorityTasks[i];
      row.push(p ? p.name : '', p ? p.planDisplay : '', p ? p.factDisplay : '', p ? p.reason : '');
    }
    for (let i = 0; i < maxExtra; i += 1) {
      const e = r.extraTasks[i];
      row.push(e ? e.name : '', e ? e.hoursDisplay : '');
    }
    lines.push(row.map(escape).join(','));
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
    let priorityDiffMinutes = 0; // різниця план/факт по пріоритетних, у хвилинах
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

    // Компактне повідомлення в чат - короткий підсумок по кожному пріоритетному
    // завданню в одному рядку (детальний план/факт по кожному - в CSV-файлі).
    const nameW = 22;
    const hoursW = 16;
    const shortW = 18;
    const prioW = 34;

    const pad = (s, w) => String(s).padEnd(w);
    const header = `${pad('ПМ', nameW)} ${pad('Години', hoursW)} ${pad('Недопрацьовано', shortW)} Пріоритетні завдання`;

    const lines = rowsData.map((r) => {
      const prioText =
        r.priorityTasks.length > 0
          ? r.priorityTasks
              .map((p) => `${p.name.length > 24 ? p.name.slice(0, 23) + '…' : p.name}: ${p.done === 'yes' ? 'Так' : 'Ні'}`)
              .join('; ')
          : '-';
      return `${pad(r.name, nameW)} ${pad(r.hoursDisplay, hoursW)} ${pad(r.shortfallDisplay, shortW)} ${prioText}`;
    });

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
      '```' +
      '\n_Детальний розклад по кожному завданню - у файлі нижче._';

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
