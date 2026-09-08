const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const {
  buildAppProgressModalStep1,
  buildAppProgressModalStep2
} = require('../blocks/appProgressModal');

function registerAppProgress(app) {
  app.command('/app-progress', async ({ ack, body, client }) => {
    await ack();

    const apps = db.get('apps').value();
    if (apps.length === 0) {
      await client.chat.postMessage({
        channel: body.user_id,
        text: 'Ще немає жодного додатку. Створи через /app-add або /app-import.'
      });
      return;
    }

    await client.views.open({
      trigger_id: body.trigger_id,
      view: buildAppProgressModalStep1(apps)
    });
  });

  // Крок 1 -> крок 2: користувач обрав додаток, підміняємо модалку на етапи саме цього додатку
  app.action('select_app', async ({ ack, body, client, action }) => {
    await ack();

    const appId = action.selected_option.value;
    const appRecord = db.get('apps').find({ id: appId }).value();

    await client.views.update({
      view_id: body.view.id,
      hash: body.view.hash,
      view: buildAppProgressModalStep2(appRecord)
    });
  });

  app.view('app_progress_submit', async ({ ack, view, body, client }) => {
    const meta = JSON.parse(view.private_metadata || '{}');
    const values = view.state.values;

    const stageSelected = values.stage?.value?.selected_option?.value || null;
    const newStageName = values.new_stage?.value?.value?.trim() || null;

    if (!stageSelected && !newStageName) {
      await ack({
        response_action: 'errors',
        errors: { new_stage: 'Обери етап зі списку або впиши новий тут' }
      });
      return;
    }

    await ack();

    let stageId = stageSelected;

    if (newStageName) {
      const appRecord = db.get('apps').find({ id: meta.appId }).value();
      const newStage = { id: uuidv4(), name: newStageName, order: appRecord.stages.length };
      db.get('apps').find({ id: meta.appId }).get('stages').push(newStage).write();
      stageId = newStage.id;
    }

    const paused = (values.paused?.value?.selected_options || []).length > 0;
    const note = values.note?.value?.value || null;
    const hours = values.hours?.value?.value ? parseFloat(values.hours.value.value) : null;

    const entry = {
      id: uuidv4(),
      appId: meta.appId,
      stageId,
      employeeId: body.user.id,
      note,
      hours,
      paused,
      date: new Date().toISOString()
    };

    db.get('appProgress').push(entry).write();

    const appRecord = db.get('apps').find({ id: meta.appId }).value();
    const stage = appRecord.stages.find((s) => s.id === stageId);

    await client.chat.postMessage({
      channel: body.user.id,
      text: `Записано: «${appRecord.name}» → етап «${stage.name}»${paused ? ' (на паузі)' : ''}.`
    });
  });
}

module.exports = { registerAppProgress };
