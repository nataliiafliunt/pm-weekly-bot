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

  app.view('employee_add_submit', async ({ ack, view, client, body }) => {
    await ack();

    const values = view.state.values;
    const slackIds = values.employee_users.value.selected_users;

    const addedNames = [];

    for (const slackId of slackIds) {
      let name = slackId;
      try {
        const info = await client.users.info({ user: slackId });
        name = info.user.profile.real_name || info.user.real_name || info.user.name || slackId;
      } catch (err) {
        console.error(`Не вдалося отримати профіль ${slackId}:`, err.message);
      }

      const existing = db.get('employees').find({ slackId }).value();
      if (existing) {
        db.get('employees').find({ slackId }).assign({ name }).write();
      } else {
        db.get('employees').push({ slackId, name }).write();
      }
      addedNames.push(name);
    }

    await client.chat.postMessage({
      channel: body.user.id,
      text: `Додано/оновлено ${addedNames.length} співробітник(ів):\n${addedNames.map((n) => `• ${n}`).join('\n')}`
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
