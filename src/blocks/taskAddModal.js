function buildTaskAddModal(employees) {
  const employeeOptions = employees.map((e) => ({
    text: { type: 'plain_text', text: e.name },
    value: e.slackId
  }));

  const today = new Date().toISOString().slice(0, 10);

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
        block_id: 'task_start_date',
        label: { type: 'plain_text', text: 'Початок' },
        element: {
          type: 'datepicker',
          action_id: 'value',
          initial_date: today,
          placeholder: { type: 'plain_text', text: 'Оберіть дату' }
        }
      },
      {
        type: 'input',
        block_id: 'task_end_date',
        optional: true,
        label: { type: 'plain_text', text: "Кінець дедлайну (якщо порожньо - тільки цей тиждень)" },
        element: {
          type: 'datepicker',
          action_id: 'value',
          placeholder: { type: 'plain_text', text: 'Оберіть дату' }
        }
      },
      {
        type: 'input',
        block_id: 'task_recurrence',
        label: { type: 'plain_text', text: 'Коли запитувати в тижневому звіті' },
        element: {
          type: 'radio_buttons',
          action_id: 'value',
          initial_option: {
            text: { type: 'plain_text', text: 'Тільки тиждень дедлайну' },
            value: 'deadline_only'
          },
          options: [
            { text: { type: 'plain_text', text: 'Тільки тиждень дедлайну' }, value: 'deadline_only' },
            { text: { type: 'plain_text', text: 'Кожен тиждень до дедлайну' }, value: 'weekly' }
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
