function buildAppAddModal(employees) {
  const { DEFAULT_STAGES } = require('../config/defaultStages');
  const employeeOptions = employees.map((e) => ({
    text: { type: 'plain_text', text: e.name },
    value: e.slackId
  }));

  return {
    type: 'modal',
    callback_id: 'app_add_submit',
    title: { type: 'plain_text', text: 'Новий додаток' },
    submit: { type: 'plain_text', text: 'Створити' },
    close: { type: 'plain_text', text: 'Скасувати' },
    blocks: [
      {
        type: 'input',
        block_id: 'app_name',
        label: { type: 'plain_text', text: 'Назва додатку' },
        element: { type: 'plain_text_input', action_id: 'value' }
      },
      {
        type: 'input',
        block_id: 'app_category',
        label: { type: 'plain_text', text: 'Категорія (Group)' },
        element: {
          type: 'plain_text_input',
          action_id: 'value',
          placeholder: { type: 'plain_text', text: 'Наприклад: Input, Output, Pusher...' }
        }
      },
      {
        type: 'input',
        block_id: 'app_stages',
        label: { type: 'plain_text', text: 'Етапи, через кому, у порядку виконання' },
        element: {
          type: 'plain_text_input',
          action_id: 'value',
          initial_value: DEFAULT_STAGES.join(', '),
          placeholder: { type: 'plain_text', text: 'Ідея, Дизайн, Розробка, Тест, Реліз' }
        }
      },
      {
        type: 'input',
        block_id: 'app_assignees',
        label: { type: 'plain_text', text: 'Відповідальні' },
        element: {
          type: 'multi_static_select',
          action_id: 'value',
          placeholder: { type: 'plain_text', text: 'Оберіть співробітників' },
          options: employeeOptions
        }
      }
    ]
  };
}

module.exports = { buildAppAddModal };
