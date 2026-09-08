// Строит форму еженедельного отчёта.
// Для каждого назначенного на неделю задания: Виконано? (так/ні) + години + причина (если "ні").
// Плюс обязательный блок "які ще завдання були виконані цього тижня" + години.
// Slack-модалки не поддерживают живой JS-расчёт суммы внутри формы,
// поэтому итоговая сумма считается на сервере при отправке (см. weeklyReport.js)
// и показывается пользователю в подтверждении после сабмита.

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
      label: { type: 'plain_text', text: 'Витрачено, год' },
      element: {
        type: 'number_input',
        action_id: 'value',
        is_decimal_allowed: true,
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
    type: 'input',
    block_id: 'extra_tasks_text',
    label: { type: 'plain_text', text: 'Які ще завдання були виконані цього тижня' },
    element: { type: 'plain_text_input', action_id: 'value', multiline: true }
  });
  blocks.push({
    type: 'input',
    block_id: 'extra_tasks_hours',
    label: { type: 'plain_text', text: 'Витрачено, год' },
    element: {
      type: 'number_input',
      action_id: 'value',
      is_decimal_allowed: true,
      initial_value: '0'
    }
  });

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
