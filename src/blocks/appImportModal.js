function buildAppImportModal() {
  return {
    type: 'modal',
    callback_id: 'app_import_submit',
    title: { type: 'plain_text', text: 'Імпорт додатків' },
    submit: { type: 'plain_text', text: 'Імпортувати' },
    close: { type: 'plain_text', text: 'Скасувати' },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            'Один рядок = один додаток, формат:\n' +
            '`Категорія | Назва додатку | Прізвище1, Прізвище2`\n\n' +
            'Якщо назва додатку порожня - буде створено один додаток з назвою категорії, ' +
            'що об\'єднає всіх людей з таких рядків.'
        }
      },
      {
        type: 'input',
        block_id: 'import_text',
        label: { type: 'plain_text', text: 'Список' },
        element: {
          type: 'plain_text_input',
          action_id: 'value',
          multiline: true,
          placeholder: {
            type: 'plain_text',
            text: 'Estimator | Визначення продуктів та їх к-сті по ТЗ | Заіченко\nInput | MIQ Bot | Флюнт, Фурсович'
          }
        }
      }
    ]
  };
}

module.exports = { buildAppImportModal };
