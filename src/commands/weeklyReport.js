const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { buildWeeklyReportModal } = require('../blocks/weeklyReportModal');
const { hoursMinutesToHours, formatHoursDisplay } = require('../utils/parseHours');
const { WEEKLY_PLAN_HOURS } = require('../config/planHours');
const { formatWeekRangeLabel } = require('../config/dates');

function extractPrefill(values) {
  const prefill = {};
  Object.keys(values || {}).forEach((blockId) => {
    const v = values[blockId]?.value;
    if (!v) return;
    if (v.selected_option) {
      prefill[blockId] = v.selected_option.value;
    } else if (v.value !== undefined && v.value !== null) {
      prefill[blockId] = v.value;
    }
  });
  return prefill;
}

function getTasksFor(slackId, weekKey) {
  return db
    .get('tasks')
    .filter((t) => t.weekKey === weekKey && (t.assignedTo === 'all' || t.assignedTo === slackId))
    .value();
}

function registerWeeklyReport(app) {
  app.action('open_weekly_report', async ({ ack, body, client }) => {
    await ack();

    const { weekKey } = JSON.parse(body.actions[0].value);
    const tasks = getTasksFor(body.user.id, weekKey);

    await client.views.open({
      trigger_id: body.trigger_id,
      view: buildWeeklyReportModal(tasks, weekKey, 1, {})
    });
  });

  app.action('add_extra_task', async ({ ack, body, client }) => {
    await ack();

    const meta = JSON.parse(body.view.private_metadata || '{}');
    const newExtraCount = Math.min((meta.extraCount || 1) + 1, 3);
    const prefill = extractPrefill(body.view.state.values);
    const tasks = getTasksFor(body.user.id, meta.weekKey);

    await client.views.update({
      view_id: body.view.id,
      hash: body.view.hash,
      view: buildWeeklyReportModal(tasks, meta.weekKey, newExtraCount, prefill)
    });
  });

  app.view('weekly_report_submit', async ({ ack, view, body, client }) => {
    const values = view.state.values;
    const meta = JSON.parse(view.private_metadata || '{}');
    const taskIds = meta.taskIds || [];
    const extraCount = meta.extraCount || 1;
    const weekKey = meta.weekKey;

    const errors = {};

    // Призначені завдання (від керівника/ментора) - Виконано? лишається
    // обов'язковим (це і є "обов'язкове завдання" в звіті), причина
    // обов'язкова тільки якщо відповідь "Ні".
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

    // Додаткові завдання - повністю необов'язкові. Можна не заповнювати
    // жодного і відправити звіт (напр. якщо тижня не було активності).
    // Валідація лише на узгодженість: якщо вписав назву - вкажи і час, і навпаки.
    for (let i = 1; i <= extraCount; i += 1) {
      const name = values[`extra_${i}_name`]?.value?.value?.trim();
      const h = values[`extra_${i}_hours`]?.value?.value;
      const m = values[`extra_${i}_minutes`]?.value?.value;
      if (name && !h && !m) errors[`extra_${i}_hours`] = 'Вкажи витрачений час для цього завдання';
      if (!name && (h || m)) errors[`extra_${i}_name`] = 'Вкажи назву завдання';
    }

    if (Object.keys(errors).length > 0) {
      await ack({ response_action: 'errors', errors });
      return;
    }

    await ack();

    let totalHours = 0;
    const taskResults = taskIds.map((id) => {
      const done = values[`task_${id}_done`].value.selected_option.value;
      const hours = hoursMinutesToHours(
        values[`task_${id}_hours`]?.value?.value,
        values[`task_${id}_minutes`]?.value?.value
      );
      const reason = values[`task_${id}_reason`]?.value?.value || null;
      totalHours += hours;
      return { taskId: id, done, hours, reason };
    });

    const extraTasks = [];
    for (let i = 1; i <= extraCount; i += 1) {
      const name = values[`extra_${i}_name`]?.value?.value?.trim();
      if (!name) continue;
      const hours = hoursMinutesToHours(
        values[`extra_${i}_hours`]?.value?.value,
        values[`extra_${i}_minutes`]?.value?.value
      );
      totalHours += hours;
      extraTasks.push({ name, hours });
    }

    totalHours = Math.round(totalHours * 100) / 100;
    const shortfallHours = Math.max(0, Math.round((WEEKLY_PLAN_HOURS - totalHours) * 100) / 100);

    db.get('reports').remove((r) => r.employeeId === body.user.id && r.weekKey === weekKey).write();

    const report = {
      id: uuidv4(),
      employeeId: body.user.id,
      weekKey,
      taskResults,
      extraTasks,
      totalHours,
      shortfallHours,
      responded: true,
      submittedAt: new Date().toISOString()
    };

    db.get('reports').push(report).write();

    const shortfallText =
      shortfallHours > 0
        ? `\nНедопрацьовано: *${formatHoursDisplay(shortfallHours)}* (з плану ${WEEKLY_PLAN_HOURS} год)`
        : '\nПлан виконано повністю ✅';

    await client.chat.postMessage({
      channel: body.user.id,
      text: `Дякую, звіт за тиждень ${formatWeekRangeLabel(weekKey)} записано.\nРазом витрачено: *${formatHoursDisplay(totalHours)}*.${shortfallText}`
    });
  });
}

module.exports = { registerWeeklyReport };
