const db = require('../db');
const { buildEmployeeAddModal } = require('../blocks/employeeAddModal');

function registerEmployeeAdd(app) {
  app.command('/employee-add', async ({ ack, body, client }) => {
    await ack();
    await client.views.open({
      trigger_id: body.trigger_id,
      view: buildEmployeeAddModal()
    });
  });

  app.view('employee_add_submit', async ({ ack, view, respond, client, body }) => {
    await ack();

    const values = view.state.values;
    const slackId = values.employee_user.value.selected_user;
    const name = values.employee_name.value.value.trim();

    const existing = db.get('employees').find({ slackId }).value();
    if (existing) {
      db.get('employees').find({ slackId }).assign({ name }).write();
    } else {
      db.get('employees').push({ slackId, name }).write();
    }

    await client.chat.postMessage({
      channel: body.user.id,
      text: existing ? `Оновлено: ${name}` : `Додано співробітника: ${name}`
    });
  });

  app.command('/employee-list', async ({ ack, respond }) => {
    await ack();
    const employees = db.get('employees').value();
    if (employees.length === 0) {
      await respond("Список порожній. Додай через /employee-add");
      return;
    }
    const text = employees.map((e) => `• ${e.name} (${e.slackId})`).join('\n');
    await respond(text);
  });
}

module.exports = { registerEmployeeAdd };
