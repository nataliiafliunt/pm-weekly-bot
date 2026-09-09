// Строит форму еженедельного отчёта.
// Для кожного призначеного завдання: Виконано? (так/ні) + години + хвилини + причина.
// Додаткові завдання (від самого ПМ) з'являються по одному - спочатку тільки
// перше, кнопка "+ Додати ще завдання" відкриває наступне (максимум 3).

const { formatWeekRangeLabel } = require('../config/dates');

function timeFields(prefix, prefill) {
  return [
    {
      type: 'input',
      block_id: `${prefix}_hours`,
      optional: true,
      label: { type: 'plain_text', text: 'Годин' },
      element: {
        type: 'number_input',
        action_id: 'value',
        is_decimal_allowed: false,
        initial_value: prefill?.[`${prefix}_hours`] ?? undefined
      }
    },
    {
      type: 'input',
      block_id: `${prefix}_minutes`,
      optional: true,
      label: { type: 'plain_text', text: 'Хвилин' },
      element: {
        type: 'number_input',
        action_id: 'value',
        is_decimal_allowed: false,
        initial_value: prefill?.[`${prefix}_minutes`] ?? undefined
      }
    }
  ];
}

function buildWeeklyReportModal(tasks, weekKey, extraCount = 1, prefill = {}) {
  const weekLabel = formatWeekRangeLabel(weekKey);

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Тижневий звіт — тиждень ${weekLabel}*\nЗаповни, будь ласка, до кінця дня.`
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
        initial_option: prefill?.[`task_${task.id}_done`]
          ? {
              text: {
                type: 'plain_text',
                text: prefill[`task_${task.id}_done`] === 'yes' ? 'Так' : 'Ні'
              },
              value: prefill[`task_${task.id}_done`]
            }
          : undefined,
        options: [
          { text: { type: 'plain_text', text: 'Так' }, value: 'yes' },
          { text: { type: 'plain_text', text: 'Ні' }, value: 'no' }
        ]
      }
    });
    blocks.push(...timeFields(`task_${task.id}`, prefill));
    blocks.push({
      type: 'input',
      block_id: `task_${task.id}_reason`,
      optional: true,
      label: { type: 'plain_text', text: 'Причина, якщо не виконано' },
      element: {
        type: 'plain_text_input',
        action_id: 'value',
        multiline: true,
        initial_value: prefill?.[`task_${task.id}_reason`] ?? undefined
      }
    });
  });

  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: '*Витрачений час на навчання або розробку цього тижня*' }
  });

  for (let i = 1; i <= extraCount; i += 1) {
    blocks.push({
      type: 'input',
      block_id: `extra_${i}_name`,
      optional: true,
      label: { type: 'plain_text', text: `Завдання ${i}` },
      element: {
        type: 'plain_text_input',
        action_id: 'value',
        initial_value: prefill?.[`extra_${i}_name`] ?? undefined
      }
    });
    blocks.push(...timeFields(`extra_${i}`, prefill));
  }

  if (extraCount < 3) {
    blocks.push({
      type: 'actions',
      block_id: 'add_extra_task_block',
      elements: [
        {
          type: 'button',
          action_id: 'add_extra_task',
          text: { type: 'plain_text', text: '+ Додати ще завдання' },
          value: String(extraCount)
        }
      ]
    });
  }

  return {
    type: 'modal',
    callback_id: 'weekly_report_submit',
    private_metadata: JSON.stringify({ taskIds: tasks.map((t) => t.id), weekKey, extraCount }),
    title: { type: 'plain_text', text: 'Тижневий звіт' },
    submit: { type: 'plain_text', text: 'Надіслати' },
    close: { type: 'plain_text', text: 'Скасувати' },
    blocks
  };
}

module.exports = { buildWeeklyReportModal };
