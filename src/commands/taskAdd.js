const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { getWeekRange } = require('../config/dates');
const { buildTaskAddModal } = require('../blocks/taskAddModal');
const { hoursMinutesToHours } = require('../utils/parseHours');

function registerTaskAdd(app) {
  app.command('/task-add', async ({ ack, body, client }) => {
    await ack();
    const employees = db.get('employees').value();

    if (employees.length === 0) {
      await client.chat.postMessage({
        channel: body.user_id,
        text: 'Спочатку додай співробітників командою /employee-add @людина Ім\'я'
      });
      return;
    }

    await client.views.open({
      trigger_id: body.trigger_id,
      view: buildTaskAddModal(employees)
    });
  });

  app.view('task_add_submit', async ({ ack, view, body, client }) => {
    await ack();

    const values = view.state.values;
    const text = values.task_text.value.value;
    const selected = values.task_assignee.value.selected_options.map((o) => o.value);
    const assignee = selected.includes('all') ? 'all' : selected;
    const hours = hoursMinutesToHours(values.task_hours.value.value, values.task_minutes.value.value);

    const startDate = values.task_start_date.value.selected_date;
    // Якщо кінець не вказано - завдання діє тільки той тиждень, до якого належить startDate
    const endDate = values.task_end_date?.value?.selected_date || startDate;

    const week = getWeekRange(new Date(startDate));

    const recurrence = values.task_recurrence.value.selected_option.value;

    const task = {
      id: uuidv4(),
      text,
      assignedTo: assignee,
      hours,
      startDate,
      endDate,
      recurrence,
      weekKey: week.key, // залишено для сумісності зі старими звітами
      createdBy: body.user.id,
      createdAt: new Date().toISOString()
    };

    db.get('tasks').push(task).write();

    const employees = db.get('employees').value();
    const targets =
      assignee === 'all' ? employees : employees.filter((e) => assignee.includes(e.slackId));

    const deadlineText = endDate !== startDate ? ` (з ${startDate} по ${endDate})` : '';

    for (const emp of targets) {
      try {
        await client.chat.postMessage({
          channel: emp.slackId,
          text: `Тобі призначено нове завдання: «${text}» (${hours} год)${deadlineText}. Воно буде з'являтись у тижневому звіті, поки не закінчиться дедлайн.`
        });
      } catch (err) {
        console.error(`Не вдалося написати ${emp.name}:`, err.message);
      }
    }
  });
}

module.exports = { registerTaskAdd };
