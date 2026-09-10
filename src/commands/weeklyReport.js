const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { buildWeeklyReportModal, PAUSE_VALUE } = require('../blocks/weeklyReportModal');
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

// Якщо "weekly" - завдання активне увесь діапазон [startDate, endDate].
// Якщо "deadline_only" (за замовчуванням) - тільки в тижні, де дедлайн.
function isTaskActiveThisWeek(task, weekKey) {
  const weekStart = new Date(weekKey);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  if (task.recurrence === 'weekly') {
    const taskStart = new Date(task.startDate || task.weekKey);
    const taskEnd = new Date(task.endDate || task.startDate || task.weekKey);
    return taskStart <= weekEnd && taskEnd >= weekStart;
  }

  const deadline = new Date(task.endDate || task.startDate || task.weekKey);
  return deadline >= weekStart && deadline <= weekEnd;
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

// Додатки, де ця людина є відповідальною - саме вони підуть у WIG-блок форми.
function getMyApps(slackId) {
  return db
    .get('apps')
    .filter((a) => Array.isArray(a.assignees) && a.assignees.includes(slackId))
    .value();
}

function registerWeeklyReport(app) {
  app.action('open_weekly_report', async ({ ack, body, client }) => {
    await ack();

    const { weekKey } = JSON.parse(body.actions[0].value);
    const tasks = getTasksFor(body.user.id, weekKey);
    const myApps = getMyApps(body.user.id);

    await client.views.open({
      trigger_id: body.trigger_id,
      view: buildWeeklyReportModal(tasks, weekKey, 0, {}, myApps)
    });
  });

  app.action('add_extra_task', async ({ ack, body, client }) => {
    await ack();

    const meta = JSON.parse(body.view.private_metadata || '{}');
    const newCount = Math.min((meta.simpleExtraCount || 0) + 1, 2);
    const prefill = extractPrefill(body.view.state.values);
    const week = getWeekRange();
    const weekKey = meta.weekKey || week.key;
    const tasks = getTasksFor(body.user.id, weekKey);
    const myApps = getMyApps(body.user.id);

    await client.views.update({
      view_id: body.view.id,
      hash: body.view.hash,
      view: buildWeeklyReportModal(tasks, weekKey, newCount, prefill, myApps)
    });
  });

  app.view('weekly_report_submit', async ({ ack, view, body, client }) => {
    const values = view.state.values;
    const meta = JSON.parse(view.private_metadata || '{}');
    const taskIds = meta.taskIds || [];
    const simpleExtraCount = meta.simpleExtraCount || 0;
    const myAppIds = meta.myAppIds || [];
    const weekKey = meta.weekKey;

    const errors = {};

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

    // Кожен призначений додаток - обов'язково лише етап. Час можна не
    // вписувати взагалі (порожньо = 0 = пауза), не треба змушувати писати "0" руками.
    myAppIds.forEach((appId) => {
      const stage = values[`wig_${appId}_stage`]?.value?.selected_option?.value;
      if (!stage) errors[`wig_${appId}_stage`] = 'Обери етап';
    });

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

    myAppIds.forEach((appId) => {
      const appRecord = apps.find((a) => a.id === appId);
      const selectedStageValue = values[`wig_${appId}_stage`].value.selected_option.value;

      let stageId = selectedStageValue;
      let paused = false;
      let hours;

      if (selectedStageValue === PAUSE_VALUE) {
        paused = true;
        hours = 0;
        // Пауза - беремо етап з останнього відомого запису по цьому додатку,
        // щоб на дашборді лишився правильний етап, просто зафарбований червоним.
        const lastEntry = db
          .get('appProgress')
          .filter((p) => p.appId === appId)
          .value()
          .sort((a, b) => (a.date > b.date ? -1 : 1))[0];
        stageId = lastEntry ? lastEntry.stageId : null;
      } else {
        hours = hoursMinutesToHours(
          values[`wig_${appId}_hours`]?.value?.value,
          values[`wig_${appId}_minutes`]?.value?.value
        );
      }

      const stage = appRecord?.stages.find((s) => s.id === stageId);

      totalHours += hours;
      extraTasks.push({
        name: `${appRecord ? appRecord.name : appId} → ${paused ? 'Пауза' : stage ? stage.name : ''}`,
        hours,
        appId
      });

      db.get('appProgress')
        .push({
          id: uuidv4(),
          appId,
          stageId,
          employeeId: body.user.id,
          note: null,
          hours,
          paused,
          date: new Date().toISOString()
        })
        .write();
    });

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
