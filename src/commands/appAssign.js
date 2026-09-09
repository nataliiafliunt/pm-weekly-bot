const db = require('../db');
const { buildAppAssignModal } = require('../blocks/appAssignModal');

function registerAppAssign(app) {
  app.command('/app-assign', async ({ ack, body, client }) => {
    await ack();

    const apps = db.get('apps').value();
    if (apps.length === 0) {
      await client.chat.postMessage({
        channel: body.user_id,
        text: 'Ще немає жодного додатку. Створи через /app-add або /app-import.'
      });
      return;
    }

    const employees = db.get('employees').value();

    await client.views.open({
      trigger_id: body.trigger_id,
      view: buildAppAssignModal(apps, employees)
    });
  });

  app.view('app_assign_submit', async ({ ack, view, body, client }) => {
    await ack();

    const values = view.state.values;
    const appId = values.assign_app.value.selected_option.value;
    const newUserIds = values.assign_users.value.selected_users;

    const appRecord = db.get('apps').find({ id: appId }).value();
    const merged = Array.from(new Set([...(appRecord.assignees || []), ...newUserIds]));

    db.get('apps').find({ id: appId }).assign({ assignees: merged }).write();

    const employees = db.get('employees').value();
    const names = newUserIds.map((id) => employees.find((e) => e.slackId === id)?.name || id);

    await client.chat.postMessage({
      channel: body.user.id,
      text: `Додано до «${appRecord.name}»: ${names.join(', ')}`
    });
  });
}

module.exports = { registerAppAssign };
