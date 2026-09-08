const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { buildWeeklyReportModal } = require('../blocks/weeklyReportModal');

function registerWeeklyReport(app) {
  // Кнопка "Заповнити звіт" из еженедельного напоминания (см. scheduler.js)
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

  // Сабмит формы отчёта
  app.view('weekly_report_submit', async ({ ack, view, body, client }) => {
    const values = view.state.values;
    const meta = JSON.parse(view.private_metadata || '{}');
    const taskIds = meta.taskIds || [];
    const weekKey = meta.weekKey;

    // Валидация: если "Виконано? Ні" - причина обов'язкова
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

    // Валидация: "які ще завдання виконані" - обов'язкове поле
    const extraText = values.extra_tasks_text?.value?.value;
    if (!extraText || extraText.trim() === '') {
      errors.extra_tasks_text = "Це поле обов'язкове";
    }

    if (Object.keys(errors).length > 0) {
      await ack({ response_action: 'errors', errors });
      return;
    }

    await ack();

    // Расчёт часов
    let totalHours = 0;
    const taskResults = taskIds.map((id) => {
      const done = values[`task_${id}_done`].value.selected_option.value;
      const hours = parseFloat(values[`task_${id}_hours`].value.value) || 0;
      const reason = values[`task_${id}_reason`]?.value?.value || null;
      totalHours += hours;
      return { taskId: id, done, hours, reason };
    });

    const extraHours = parseFloat(values.extra_tasks_hours.value.value) || 0;
    totalHours += extraHours;
    totalHours = Math.round(totalHours * 10) / 10;

    const report = {
      id: uuidv4(),
      employeeId: body.user.id,
      weekKey,
      taskResults,
      extraText,
      extraHours,
      totalHours,
      submittedAt: new Date().toISOString()
    };

    db.get('reports').push(report).write();

    // Подтверждение с итоговой суммой (Slack не умеет живой расчёт внутри модалки,
    // поэтому показываем итог сразу после отправки)
    await client.chat.postMessage({
      channel: body.user.id,
      text: `Дякую, звіт за тиждень ${weekKey} записано.\nРазом витрачено: *${totalHours} год*.`
    });
  });
}

module.exports = { registerWeeklyReport };
