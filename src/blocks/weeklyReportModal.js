// Форма тижневого звіту.
// 1. Пріоритетні завдання (від керівника) - Виконано? + години/хвилини (обов'язково) + причина.
// 2. WIG PM Bots and Apps - для КОЖНОГО додатку, до якого людина призначена
//    (без вибору зі списку - додаток уже відомий) - етап + години/хвилини.
//    0 годин 0 хвилин = додаток на паузі цього тижня.
// 3. Додаткові прості завдання (кнопка "+ Додати ще завдання", до 2 штук) -
//    просто назва (вільний текст) + години/хвилини.

const { formatWeekRangeLabel } = require('../config/dates');
const { formatHoursDisplay } = require('../utils/parseHours');

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

// myApps - додатки, де ця людина є у списку assignees (фільтрується в weeklyReport.js)
function buildWeeklyReportModal(tasks, weekKey, simpleExtraCount = 0, prefill = {}, myApps = []) {
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
        text: `*Пріоритетне завдання:* ${task.text}\n_Розрахована кількість часу: ${formatHoursDisplay(task.hours)}_`
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

  // ---- WIG PM Bots and Apps - по одному блоку на кожен призначений додаток ----
  if (myApps.length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '*WIG PM Bots and Apps*' }
    });

    myApps.forEach((app) => {
      const stageOptions = app.stages.map((s) => ({
        text: { type: 'plain_text', text: s.name },
        value: s.id
      }));
      const selectedStage = prefill?.[`wig_${app.id}_stage`];

      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `*Додаток:* ${app.name}` }
      });
      blocks.push({
        type: 'input',
        block_id: `wig_${app.id}_stage`,
        label: { type: 'plain_text', text: 'На якому етапі зараз' },
        element: {
          type: 'static_select',
          action_id: 'value',
          initial_option: selectedStage ? stageOptions.find((o) => o.value === selectedStage) : undefined,
          options: stageOptions
        }
      });
      blocks.push(...timeFields(`wig_${app.id}`, prefill));
    });

    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: '_0 годин 0 хвилин = додаток на паузі цього тижня_' }]
    });
  }

  // ---- Прості додаткові завдання ----
  if (simpleExtraCount > 0) {
    blocks.push({ type: 'divider' });
  }

  for (let i = 1; i <= simpleExtraCount; i += 1) {
    blocks.push({
      type: 'input',
      block_id: `extra_${i}_name`,
      optional: true,
      label: { type: 'plain_text', text: `Завдання ${i}` },
      element: {
        type: 'plain_text_input',
        action_id: 'value',
        placeholder: { type: 'plain_text', text: 'Опиши завдання' },
        initial_value: prefill?.[`extra_${i}_name`] ?? undefined
      }
    });
    blocks.push(...timeFields(`extra_${i}`, prefill));
  }

  if (simpleExtraCount < 2) {
    blocks.push({
      type: 'actions',
      block_id: 'add_extra_task_block',
      elements: [
        {
          type: 'button',
          action_id: 'add_extra_task',
          text: { type: 'plain_text', text: '+ Додати ще завдання' },
          value: String(simpleExtraCount)
        }
      ]
    });
  }

  return {
    type: 'modal',
    callback_id: 'weekly_report_submit',
    private_metadata: JSON.stringify({
      taskIds: tasks.map((t) => t.id),
      weekKey,
      simpleExtraCount,
      myAppIds: myApps.map((a) => a.id)
    }),
    title: { type: 'plain_text', text: 'Тижневий звіт' },
    submit: { type: 'plain_text', text: 'Надіслати' },
    close: { type: 'plain_text', text: 'Скасувати' },
    blocks
  };
}

module.exports = { buildWeeklyReportModal };
