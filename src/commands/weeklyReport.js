const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { buildWeeklyReportModal, WIG_NONE_VALUE } = require('../blocks/weeklyReportModal');
const { hoursMinutesToHours, formatHoursDisplay } = require('../utils/parseHours');
const { WEEKLY_PLAN_HOURS } = require('../config/planHours');
const { formatWeekRangeLabel, getWeekRange } = require('../config/dates');

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

// Завдання діє в цьому тижні, якщо його діапазон [startDate, endDate]
// перетинається з тижнем [weekStart, weekEnd]. Для старих завдань без цих
// полів - фолбек на weekKey (як було раніше, тільки той тиждень).
function isTaskActiveThisWeek(task, weekKey) {
  const weekStart = new Date(weekKey);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const taskStart = new Date(task.startDate || task.weekKey);
  const taskEnd = new Date(task.endDate || task.startDate || task.weekKey);

  return taskStart <= weekEnd && taskEnd >= weekStart;
}

function getTasksFor(slackId, weekKey) {
  return db
    .get('tasks')
    .filter(
      (t) =>
        isTaskActiveThisWeek(t, weekKey) &&
        (t.assignedTo === 'all' ||
          (Array.isArray(t.assignedTo) && t.assignedTo.includes(slackId)))
    )
    .value();
}

function registerWeeklyReport(app) {
  app.action('open_weekly_report', async ({ ack, body, client }) => {
    await ack();

    const { weekKey } = JSON.parse(body.actions[0].value);
    const tasks = getTasksFor(body.user.id, weekKey);
    const apps = db.get('apps').value();

    await client.views.open({
      trigger_id: body.trigger_id,
      view: buildWeeklyReportModal(tasks, weekKey, 0, {}, apps)
    });
  });

  app.action('add_extra_task', async ({ ack, body, client }) => {
    await ack();

    const meta = JSON.parse(body.view.private_metadata || '{}');
    const newCount = Math.min((meta.simpleExtraCount || 0) + 1, 2);
    const prefill = extractPrefill(body.view.state.values);
    const week = getWeekRange();
    const tasks = getTasksFor(body.user.id, meta.weekKey || week.key);
    const apps = db.get('apps').value();

    await client.views.update({
      view_id: body.view.id,
      hash: body.view.hash,
      view: buildWeeklyReportModal(tasks, meta.weekKey, newCount, prefill, apps)
    });
  });

  // Вибір додатку у WIG PM Bots and Apps - перебудовуємо модалку, щоб
  // показати етап/пауза/час саме для цього додатку.
  app.action('wig_app_select', async ({ ack, body, client }) => {
    await ack();

    const meta = JSON.parse(body.view.private_metadata || '{}');
    const prefill = extractPrefill(body.view.state.values);
    const tasks = getTasksFor(body.user.id, meta.weekKey);
    const apps = db.get('apps').value();

    await client.views.update({
      view_id: body.view.id,
      hash: body.view.hash,
      view: buildWeeklyReportModal(tasks, meta.weekKey, meta.simpleExtraCount || 0, prefill, apps)
    });
  });

  app.view('weekly_report_submit', async ({ ack, view, body, client }) => {
    const values = view.state.values;
    const meta = JSON.parse(view.private_metadata || '{}');
    const taskIds = meta.taskIds || [];
    const simpleExtraCount = meta.simpleExtraCount || 0;
    const weekKey = meta.weekKey;

    const errors = {};

    // Пріоритетні завдання - виконано? обов'язково, причина обов'язкова
    // якщо "ні", і ЧАС ТЕПЕР ОБОВ'ЯЗКОВИЙ (потрібно точно знати, скільки пішло часу).
    taskIds.forEach((id) => {
      const done = values[`task_${id}_done`]?.value?.selected_option?.value;
      const reason = values[`task_${id}_reason`]?.value?.value;
      const h = values[`task_${id}_hours`]?.value?.value;
      const m = values[`task_${id}_minutes`]?.value?.value;

      if (!done) {
        errors[`task_${id}_done`] = "Обери, виконано завдання чи ні";
      }
      if (done === 'no' && (!reason || reason.trim() === '')) {
        errors[`task_${id}_reason`] = 'Вкажи причину, чому завдання не виконано';
      }
      if (!h && !m) {
        errors[`task_${id}_hours`] = 'Вкажи, скільки часу витрачено (навіть 0)';
      }
    });

    // WIG PM Bots and Apps - обов'язковий вибір
    const wigValue = values.wig_app_select?.value?.selected_option?.value;
    if (!wigValue) {
      errors.wig_app_select = "Обери додаток або познач, що не працював(ла) над додатками";
    } else if (wigValue !== WIG_NONE_VALUE) {
      const stage = values.wig_stage?.value?.selected_option?.value;
      const wh = values.wig_hours?.value?.value;
      const wm = values.wig_minutes?.value?.value;
      if (!stage) errors.wig_stage = 'Обери етап';
      if (!wh && !wm) errors.wig_hours = 'Вкажи, скільки часу витрачено';
    }

    // Прості додаткові завдання - повністю необов'язкові, але узгоджені
    for (let i = 1; i <= simpleExtraCount; i += 1) {
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

    const apps = db.get('apps').value();
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

    // WIG PM Bots and Apps
    if (wigValue !== WIG_NONE_VALUE) {
      const appRecord = apps.find((a) => a.id === wigValue);
      const stageId = values.wig_stage.value.selected_option.value;
      const stage = appRecord?.stages.find((s) => s.id === stageId);
      const paused = (values.wig_paused?.value?.selected_options || []).length > 0;
      const hours = hoursMinutesToHours(
        values.wig_hours?.value?.value,
        values.wig_minutes?.value?.value
      );

      totalHours += hours;
      extraTasks.push({
        name: `${appRecord ? appRecord.name : wigValue} → ${stage ? stage.name : ''}`,
        hours,
        appId: wigValue
      });

      db.get('appProgress')
        .push({
          id: uuidv4(),
          appId: wigValue,
          stageId,
          employeeId: body.user.id,
          note: null,
          hours,
          paused,
          date: new Date().toISOString()
        })
        .write();
    }

    // Прості додаткові завдання
    for (let i = 1; i <= simpleExtraCount; i += 1) {
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
