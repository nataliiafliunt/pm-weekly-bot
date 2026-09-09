// Модалка для додавання співробітника - вибір людини через нативний
// Slack-пікер (users_select) замість ручного набору тексту з @згадкою,
// щоб уникнути помилок формату.

function buildEmployeeAddModal() {
  return {
    type: 'modal',
    callback_id: 'employee_add_submit',
    title: { type: 'plain_text', text: 'Новий співробітник' },
    submit: { type: 'plain_text', text: 'Додати' },
    close: { type: 'plain_text', text: 'Скасувати' },
    blocks: [
      {
        type: 'input',
        block_id: 'employee_user',
        label: { type: 'plain_text', text: 'Людина в Slack' },
        element: {
          type: 'users_select',
          action_id: 'value',
          placeholder: { type: 'plain_text', text: "Оберіть зі списку" }
        }
      },
      {
        type: 'input',
        block_id: 'employee_name',
        label: { type: 'plain_text', text: "Ім'я Прізвище (для відображення у звітах)" },
        element: { type: 'plain_text_input', action_id: 'value' }
      }
    ]
  };
}

module.exports = { buildEmployeeAddModal };
