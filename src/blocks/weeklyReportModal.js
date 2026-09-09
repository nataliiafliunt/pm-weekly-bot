function buildWeeklyReportModal(tasks, weekKey) {
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Тижневий звіт — тиждень ${weekKey}*\nЗаповни, будь ласка, до кінця дня.`
      }
    }
  ];

  tasks.forEach((task) => {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Завдання:* ${task.text}\n_План: ${task.hours} год_`
      }
    });
    blocks.push({
      type: 'input',
      block_id: `task_${task.id}_done`,
      label: { type: 'plain_text', text: 'Виконано?' },
      element: {
        type: 'radio_buttons',
        action_id: 'value',
        options: [
          { text: { type: 'plain_text', text: 'Так' }, value: 'yes' },
          { text: { type: 'plain_text', text: 'Ні' }, value: 'no' }
        ]
      }
    });
    blocks.push({
      type: 'input',
      block_id: `task_${task.id}_hours`,
      label: { type: 'plain_text', text: 'Витрачено (год або хв, напр. "90 хв")' },
      element: {
        type: 'plain_text_input',
        action_id: 'value',
        initial_value: String(task.hours)
      }
    });
    blocks.push({
      type: 'input',
      block_id: `task_${task.id}_reason`,
      optional: true,
      label: { type: 'plain_text', text: 'Причина, якщо не виконано' },
      element: { type: 'plain_text_input', action_id: 'value', multiline: true }
    });
  });

  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: '*Додаткові завдання цього тижня* (мінімум одне)' }
  });

  for (let i = 1; i <= 3; i += 1) {
    blocks.push({
      type: 'input',
      block_id: `extra_${i}_name`,
      optional: i !== 1,
      label: { type: 'plain_text', text: `Завдання ${i} - що було зроблено` },
      element: { type: 'plain_text_input', action_id: 'value' }
    });
    blocks.push({
      type: 'input',
      block_id: `extra_${i}_hours`,
      optional: i !== 1,
      label: { type: 'plain_text', text: 'Скільки часу витрачено (год або хв)' },
      element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'напр. 1.5 або 90 хв' } }
    });
  }

  return {
    type: 'modal',
    callback_id: 'weekly_report_submit',
    private_metadata: JSON.stringify({ taskIds: tasks.map((t) => t.id), weekKey }),
    title: { type: 'plain_text', text: 'Тижневий звіт' },
    submit: { type: 'plain_text', text: 'Надіслати' },
    close: { type: 'plain_text', text: 'Скасувати' },
    blocks
  };
}

module.exports = { buildWeeklyReportModal };
