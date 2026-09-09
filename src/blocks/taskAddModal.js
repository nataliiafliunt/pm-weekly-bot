function buildTaskAddModal(employees) {
  const employeeOptions = employees.map((e) => ({
    text: { type: 'plain_text', text: e.name },
    value: e.slackId
  }));

  return {
    type: 'modal',
    callback_id: 'task_add_submit',
    title: { type: 'plain_text', text: 'Нове завдання' },
    submit: { type: 'plain_text', text: 'Створити' },
    close: { type: 'plain_text', text: 'Скасувати' },
    blocks: [
      {
        type: 'input',
        block_id: 'task_text',
        label: { type: 'plain_text', text: 'Текст завдання' },
        element: { type: 'plain_text_input', action_id: 'value', multiline: true }
      },
      {
        type: 'input',
        block_id: 'task_assignee',
        label: { type: 'plain_text', text: 'Кому (можна обрати декількох)' },
        element: {
          type: 'multi_static_select',
          action_id: 'value',
          placeholder: { type: 'plain_text', text: 'Оберіть одного чи декількох' },
          options: [
            { text: { type: 'plain_text', text: 'Вся команда' }, value: 'all' },
            ...employeeOptions
          ]
        }
      },
      {
        type: 'input',
        block_id: 'task_hours',
        label: { type: 'plain_text', text: 'Орієнтовно, годин' },
        optional: true,
        element: {
          type: 'number_input',
          action_id: 'value',
          is_decimal_allowed: false,
          initial_value: '0'
        }
      },
      {
        type: 'input',
        block_id: 'task_minutes',
        label: { type: 'plain_text', text: 'Орієнтовно, хвилин' },
        optional: true,
        element: {
          type: 'number_input',
          action_id: 'value',
          is_decimal_allowed: false,
          initial_value: '30'
        }
      }
    ]
  };
}

module.exports = { buildTaskAddModal };
