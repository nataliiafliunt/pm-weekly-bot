const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { buildAppAddModal } = require('../blocks/appAddModal');

function registerAppAdd(app) {
  app.command('/app-add', async ({ ack, body, client }) => {
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
      view: buildAppAddModal(employees)
    });
  });

  app.view('app_add_submit', async ({ ack, view, body, client }) => {
    await ack();

    const values = view.state.values;
    const name = values.app_name.value.value.trim();
    const category = values.app_category.value.value.trim();
    const stagesRaw = values.app_stages.value.value;
    const assigneeIds = values.app_assignees.value.selected_options.map((o) => o.value);

    const stages = stagesRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name, idx) => ({ id: uuidv4(), name, order: idx }));

    const appRecord = {
      id: uuidv4(),
      name,
      category,
      stages,
      assignees: assigneeIds,
      createdBy: body.user.id,
      createdAt: new Date().toISOString()
    };

    db.get('apps').push(appRecord).write();

    await client.chat.postMessage({
      channel: body.user.id,
      text: `Додаток «${name}» створено (${stages.length} етапів, ${assigneeIds.length} відповідальних).`
    });
  });
}

module.exports = { registerAppAdd };
