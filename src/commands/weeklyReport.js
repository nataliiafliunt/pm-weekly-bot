const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { buildWeeklyReportModal } = require('../blocks/weeklyReportModal');
const { parseHoursFromText } = require('../utils/parseHours');
const { WEEKLY_PLAN_HOURS } = require('../config/planHours');

function registerWeeklyReport(app) {
  app.action('open_weekly_report', async ({ ack, body, client }) => {
    await ack();

    const { weekKey } = JSON.parse(body.actions[0].value);
    const slackId = body.user.id;

    const tasks = db
      .get('tasks')
      .filter((t) => t.weekKey === weekKey && (t.assignedTo === 'all' || t.assignedTo === slackId))
      .value();

    await client.views.open({
      trigger_id: body.trigger_id,
      view: buildWeeklyReportModal(tasks, weekKey)
    });
  });

  app.view('weekly_report_submit', async ({ ack, view, body, client }) => {
    const values = view.state.values;
    const meta = JSON.parse(view.private_metadata || '{}');
    const taskIds = meta.taskIds || [];
    const weekKey = meta.weekKey;

    const errors = {};

    taskIds.forEach((id) => {
      const done = values[`task_${id}_done`]?.value?.selected_option?.value;
      const reason = values[`task_${id}_reason`]?.value?.value;
      if (done === 'no' && (!reason || reason.trim() === '')) {
        errors[`task_${id}_reason`] = 'Вкажи причину, чому завдання не виконано';
      }
      if (!done) {
        errors[`task_${id}_done`] = "Обери, виконано завдання чи ні";
      }
    });

    const extra1Name = values.extra_1_name?.value?.value?.trim();
    const extra1Hours = values.extra_1_hours?.value?.value?.trim();
    if (!extra1Name) errors.extra_1_name = "Це поле обов'язкове";
    if (!extra1Hours) errors.extra_1_hours = "Вкажи витрачений час";

    for (let i = 2; i <= 3; i += 1) {
      const name = values[`extra_${i}_name`]?.value?.value?.trim();
      const hours = values[`extra_${i}_hours`]?.value?.value?.trim();
      if (name && !hours) errors[`extra_${i}_hours`] = 'Вкажи витрачений час для цього завдання';
      if (!name && hours) errors[`extra_${i}_name`] = 'Вкажи назву завдання';
    }

    if (Object.keys(errors).length > 0) {
      await ack({ response_action: 'errors', errors });
      return;
    }

    await ack();

    let totalHours = 0;
    const taskResults = taskIds.map((id) => {
      const done = values[`task_${id}_done`].value.selected_option.value;
      const hoursText = values[`task_${id}_hours`].value.value;
      const hours = parseHoursFromText(hoursText);
      const reason = values[`task_${id}_reason`]?.value?.value || null;
      totalHours += hours;
      return { taskId: id, done, hours, reason };
    });

    const extraTasks = [];
    for (let i = 1; i <= 3; i += 1) {
      const name = values[`extra_${i}_name`]?.value?.value?.trim();
      const hoursText = values[`extra_${i}_hours`]?.value?.value;
      if (!name) continue;
      const hours = parseHoursFromText(hoursText);
      totalHours += hours;
      extraTasks.push({ name, hours });
    }

    totalHours = Math.round(totalHours * 100) / 100;
    const shortfallHours = Math.max(0, Math.round((WEEKLY_PLAN_HOURS - totalHours) * 100) / 100);

    const report = {
      id: uuidv4(),
      employeeId: body.user.id,
      weekKey,
      taskResults,
      extraTasks,
      totalHours,
      shortfallHours,
      submittedAt: new Date().toISOString()
    };

    db.get('reports').push(report).write();

    const shortfallText =
      shortfallHours > 0
        ? `\nНедопрацьовано: *${shortfallHours} год* (з плану ${WEEKLY_PLAN_HOURS} год)`
        : '\nПлан виконано повністю ✅';

    await client.chat.postMessage({
      channel: body.user.id,
      text: `Дякую, звіт за тиждень ${weekKey} записано.\nРазом витрачено: *${totalHours} год*.${shortfallText}`
    });
  });
}

module.exports = { registerWeeklyReport };
