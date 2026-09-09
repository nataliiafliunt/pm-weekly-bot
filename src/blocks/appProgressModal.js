// Крок 1: показуємо тільки вибір додатку.
// Після вибору (app.action 'select_app' в appProgress.js) модалка
// оновлюється через views.update і показує етапи саме цього додатку.

function buildAppProgressModalStep1(apps) {
  const options = apps.map((a) => ({
    text: { type: 'plain_text', text: a.name },
    value: a.id
  }));

  return {
    type: 'modal',
    callback_id: 'app_progress_step1',
    title: { type: 'plain_text', text: 'Прогрес по додатку' },
    close: { type: 'plain_text', text: 'Скасувати' },
    blocks: [
      {
        type: 'input',
        block_id: 'select_app',
        dispatch_action: true,
        label: { type: 'plain_text', text: 'Додаток' },
        element: {
          type: 'static_select',
        action_id: 'select_app_action',
          placeholder: { type: 'plain_text', text: 'Оберіть додаток' },
          options
        }
      }
    ]
  };
}

function buildAppProgressModalStep2(app) {
  const stageOptions = app.stages.map((s) => ({
    text: { type: 'plain_text', text: s.name },
    value: s.id
  }));

  const blocks = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Додаток:* ${app.name}` }
    }
  ];

  if (stageOptions.length > 0) {
    blocks.push({
      type: 'input',
      block_id: 'stage',
      optional: true,
      label: { type: 'plain_text', text: 'Етап зі списку' },
      element: {
        type: 'static_select',
        action_id: 'value',
        placeholder: { type: 'plain_text', text: 'Оберіть етап' },
        options: stageOptions
      }
    });
  }

  blocks.push({
    type: 'input',
    block_id: 'new_stage',
    optional: true,
    label: { type: 'plain_text', text: "Або новий етап, якщо немає у списку" },
    element: { type: 'plain_text_input', action_id: 'value' }
  });

  blocks.push({
    type: 'input',
    block_id: 'paused',
    optional: true,
    label: { type: 'plain_text', text: ' ' },
    element: {
      type: 'checkboxes',
      action_id: 'value',
      options: [{ text: { type: 'plain_text', text: 'Наразі на паузі' }, value: 'paused' }]
    }
  });

  blocks.push({
    type: 'input',
    block_id: 'note',
    optional: true,
    label: { type: 'plain_text', text: 'Коментар (необов\'язково)' },
    element: { type: 'plain_text_input', action_id: 'value', multiline: true }
  });

  blocks.push({
    type: 'input',
    block_id: 'hours',
    optional: true,
    label: { type: 'plain_text', text: 'Витрачено, год (необов\'язково)' },
    element: {
      type: 'number_input',
      action_id: 'value',
      is_decimal_allowed: true
    }
  });

  return {
    type: 'modal',
    callback_id: 'app_progress_submit',
    private_metadata: JSON.stringify({ appId: app.id }),
    title: { type: 'plain_text', text: 'Прогрес по додатку' },
    submit: { type: 'plain_text', text: 'Зберегти' },
    close: { type: 'plain_text', text: 'Скасувати' },
    blocks
  };
}

module.exports = { buildAppProgressModalStep1, buildAppProgressModalStep2 };
