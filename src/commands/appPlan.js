const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { getWeekRange } = require('../config/dates');
const { buildAppPlanModalStep1, buildAppPlanModalStep2 } = require('../blocks/appPlanModal');

function registerAppPlan(app) {
  app.command('/app-plan', async ({ ack, body, client }) => {
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
      view: buildAppPlanModalStep1(apps)
    });
  });

  app.action({ action_id: 'value', block_id: 'plan_app_select' }, async ({ ack, body, client, action }) => {
    await ack();

    const appId = action.selected_option.value;
    const appRecord = db.get('apps').find({ id: appId }).value();

    await client.views.update({
      view_id: body.view.id,
      hash: body.view.hash,
      view: buildAppPlanModalStep2(appRecord)
    });
  });

  app.view('app_plan_submit', async ({ ack, view, body, client }) => {
    await ack();

    const meta = JSON.parse(view.private_metadata || '{}');
    const values = view.state.values;

    const weekDate = values.plan_week_date.value.selected_date;
    const weekKey = getWeekRange(new Date(weekDate)).key;
    const stageId = values.plan_stage.value.selected_option.value;

    db.get('appPlan').remove((p) => p.appId === meta.appId && p.weekKey === weekKey).write();

    db.get('appPlan')
      .push({
        id: uuidv4(),
        appId: meta.appId,
        weekKey,
        stageId,
        createdBy: body.user.id,
        createdAt: new Date().toISOString()
      })
      .write();

    const appRecord = db.get('apps').find({ id: meta.appId }).value();
    const stage = appRecord.stages.find((s) => s.id === stageId);

    await client.chat.postMessage({
      channel: body.user.id,
      text: `План збережено: «${appRecord.name}», тиждень ${weekKey} → «${stage ? stage.name : stageId}»`
    });
  });
}

module.exports = { registerAppPlan };
