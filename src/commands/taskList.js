const db = require('../db');

function registerTaskList(app) {
  app.command('/task-list', async ({ ack, respond }) => {
    await ack();

    const tasks = db.get('tasks').value();
    if (tasks.length === 0) {
      await respond('Завдань ще немає.');
      return;
    }

    const text = tasks
      .map((t, i) => `${i + 1}. «${t.text}» — дедлайн ${t.endDate || t.weekKey}, частота: ${t.recurrence || 'deadline_only'}`)
      .join('\n');

    await respond({ text, response_type: 'ephemeral' });
  });
}

module.exports = { registerTaskList };
