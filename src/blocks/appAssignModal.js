function buildAppAssignModal(apps, employees) {
  const appOptions = apps.map((a) => ({
    text: { type: 'plain_text', text: a.name },
    value: a.id
  }));

  return {
    type: 'modal',
    callback_id: 'app_assign_submit',
    title: { type: 'plain_text', text: 'Призначити на додаток' },
    submit: { type: 'plain_text', text: 'Додати' },
    close: { type: 'plain_text', text: 'Скасувати' },
    blocks: [
      {
        type: 'input',
        block_id: 'assign_app',
        label: { type: 'plain_text', text: 'Додаток' },
        element: {
          type: 'static_select',
          action_id: 'value',
          placeholder: { type: 'plain_text', text: 'Оберіть додаток' },
          options: appOptions
        }
      },
      {
        type: 'input',
        block_id: 'assign_users',
        label: { type: 'plain_text', text: "Кого додати (можна декількох)" },
        element: {
          type: 'multi_users_select',
          action_id: 'value',
          placeholder: { type: 'plain_text', text: 'Оберіть людей' }
        }
      }
    ]
  };
}

module.exports = { buildAppAssignModal };
