const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { getWeekRange } = require('../config/dates');
const { buildTaskAddModal } = require('../blocks/taskAddModal');

function registerTaskAdd(app) {
  // Открывает форму создания задания
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

  // Обрабатывает отправку формы создания задания
  app.view('task_add_submit', async ({ ack, view, body, client }) => {
    await ack();

    const values = view.state.values;
    const text = values.task_text.value.value;
    const assignee = values.task_assignee.value.selected_option.value;
    const hours = parseFloat(values.task_hours.value.value) || 0;

    const week = getWeekRange();

    const task = {
      id: uuidv4(),
      text,
      assignedTo: assignee, // 'all' или slackId конкретного человека
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
