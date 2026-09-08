const db = require('../db');

// Формат: /employee-add @людина Ім'я Прізвище
function registerEmployeeAdd(app) {
  app.command('/employee-add', async ({ command, ack, respond }) => {
    await ack();

    const match = command.text.match(/^<@([A-Z0-9]+)(\|[^>]+)?>\s*(.*)$/i);
    if (!match) {
      await respond("Формат: /employee-add @людина Ім'я Прізвище");
      return;
    }

    const slackId = match[1];
    const name = match[3].trim() || slackId;

    const existing = db.get('employees').find({ slackId }).value();
    if (existing) {
      db.get('employees').find({ slackId }).assign({ name }).write();
      await respond(`Оновлено: ${name}`);
    } else {
      db.get('employees').push({ slackId, name }).write();
      await respond(`Додано співробітника: ${name}`);
    }
  });

  app.command('/employee-list', async ({ ack, respond }) => {
    await ack();
    const employees = db.get('employees').value();
    if (employees.length === 0) {
      await respond('Список порожній. Додай через /employee-add @людина Ім\'я');
      return;
    }
    const text = employees.map((e) => `• ${e.name} (${e.slackId})`).join('\n');
    await respond(text);
  });
}

module.exports = { registerEmployeeAdd };
