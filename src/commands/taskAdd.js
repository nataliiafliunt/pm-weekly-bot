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
    const assignee = values.task_assignee.value.selected_option.value;
    const hours = hoursMinutesToHours(values.task_hours.value.value, values.task_minutes.value.value);

    const week = getWeekRange();

    const task = {
      id: uuidv4(),
      text,
      assignedTo: assignee,
      hours,
      weekKey: week.key,
      createdBy: body.user.id,
      createdAt: new Date().toISOString()
    };

    db.get('tasks').push(task).write();

    const employees = db.get('employees').value();
    const targets =
      assignee === 'all' ? employees : employees.filter((e) => e.slackId === assignee);

    for (const emp of targets) {
      try {
        await client.chat.postMessage({
          channel: emp.slackId,
          text: `Тобі призначено нове завдання на цей тиждень: «${text}» (${hours} год). Звіт по ньому потрібно буде заповнити наприкінці тижня.`
        });
      } catch (err) {
        console.error(`Не вдалося написати ${emp.name}:`, err.message);
      }
    }
  });
}

module.exports = { registerTaskAdd };
