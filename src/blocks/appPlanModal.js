function buildAppPlanModalStep1(apps) {
  const options = apps.map((a) => ({
    text: { type: 'plain_text', text: a.name },
    value: a.id
  }));

  return {
    type: 'modal',
    callback_id: 'app_plan_step1',
    title: { type: 'plain_text', text: 'План по додатку' },
    close: { type: 'plain_text', text: 'Скасувати' },
    blocks: [
      {
        type: 'input',
        block_id: 'plan_app_select',
        dispatch_action: true,
        label: { type: 'plain_text', text: 'Додаток' },
        element: {
          type: 'static_select',
          action_id: 'value',
          placeholder: { type: 'plain_text', text: 'Оберіть додаток' },
          options
        }
      }
    ]
  };
}

function buildAppPlanModalStep2(app) {
  const stageOptions = app.stages.map((s) => ({
    text: { type: 'plain_text', text: s.name },
    value: s.id
  }));

  const today = new Date().toISOString().slice(0, 10);

  return {
    type: 'modal',
    callback_id: 'app_plan_submit',
    private_metadata: JSON.stringify({ appId: app.id }),
    title: { type: 'plain_text', text: 'План по додатку' },
    submit: { type: 'plain_text', text: 'Зберегти' },
    close: { type: 'plain_text', text: 'Скасувати' },
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Додаток:* ${app.name}` }
      },
      {
        type: 'input',
        block_id: 'plan_week_date',
        label: { type: 'plain_text', text: 'Будь-яка дата того тижня, на який плануєш' },
        element: {
          type: 'datepicker',
          action_id: 'value',
          initial_date: today,
          placeholder: { type: 'plain_text', text: 'Оберіть дату' }
        }
      },
      {
        type: 'input',
        block_id: 'plan_stage',
        label: { type: 'plain_text', text: 'Запланований етап на цей тиждень' },
        element: {
          type: 'static_select',
          action_id: 'value',
          options: stageOptions
        }
      }
    ]
  };
}

module.exports = { buildAppPlanModalStep1, buildAppPlanModalStep2 };
