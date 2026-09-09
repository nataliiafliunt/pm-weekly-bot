// Модалка додавання співробітників - мультивибір людей одразу,
// ім'я береться автоматично з їх Slack-профілю (без ручного вводу).

function buildEmployeeAddModal() {
  return {
    type: 'modal',
    callback_id: 'employee_add_submit',
    title: { type: 'plain_text', text: 'Нові співробітники' },
    submit: { type: 'plain_text', text: 'Додати' },
    close: { type: 'plain_text', text: 'Скасувати' },
    blocks: [
      {
        type: 'input',
        block_id: 'employee_users',
        label: { type: 'plain_text', text: 'Люди в Slack' },
        element: {
          type: 'multi_users_select',
          action_id: 'value',
          placeholder: { type: 'plain_text', text: 'Оберіть одного чи декількох' }
        }
      }
    ]
  };
}

module.exports = { buildEmployeeAddModal };
