// Форма тижневого звіту.
// 1. Пріоритетні завдання (від керівника) - Виконано? + години/хвилини (обов'язково) + причина.
// 2. WIG PM Bots and Apps - ОБОВ'ЯЗКОВИЙ блок: обираєш додаток (або "не працював
//    над додатками") + етап + години/хвилини.
// 3. Додаткові прості завдання (кнопка "+ Додати ще завдання", до 2 штук) -
//    просто назва (вільний текст) + години/хвилини, без вибору додатку.

const { formatWeekRangeLabel } = require('../config/dates');
const { formatHoursDisplay } = require('../utils/parseHours');

const WIG_NONE_VALUE = '__none__';

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

function buildWeeklyReportModal(tasks, weekKey, simpleExtraCount = 0, prefill = {}, apps = []) {
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

  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: '*WIG PM Bots and Apps* (обов\'язково)' }
  });

  const wigOptions = [
    ...apps.map((a) => ({ text: { type: 'plain_text', text: a.name }, value: a.id })),
    { text: { type: 'plain_text', text: 'Не працював(ла) над додатками цього тижня' }, value: WIG_NONE_VALUE }
  ];
  const wigSelected = prefill?.wig_app_select;
  const wigApp = apps.find((a) => a.id === wigSelected);

  blocks.push({
    type: 'input',
    block_id: 'wig_app_select',
    dispatch_action: true,
    label: { type: 'plain_text', text: 'Додаток' },
    element: {
      type: 'static_select',
      action_id: 'value',
      placeholder: { type: 'plain_text', text: 'Оберіть додаток' },
      initial_option: wigSelected ? wigOptions.find((o) => o.value === wigSelected) : undefined,
      options: wigOptions
    }
  });

  if (wigApp) {
    const stageOptions = wigApp.stages.map((s) => ({
      text: { type: 'plain_text', text: s.name },
      value: s.id
    }));
    const wigStageSelected = prefill?.wig_stage;

    blocks.push({
      type: 'input',
      block_id: 'wig_stage',
      label: { type: 'plain_text', text: `На якому етапі зараз "${wigApp.name}"` },
      element: {
        type: 'static_select',
        action_id: 'value',
        initial_option: wigStageSelected ? stageOptions.find((o) => o.value === wigStageSelected) : undefined,
        options: stageOptions
      }
    });

    blocks.push(...timeFields('wig', prefill));
  }

  if (simpleExtraCount > 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '*Додаткові завдання*' }
    });
  }

  for (let i = 1; i <= simpleExtraCount; i += 1) {
    blocks.push({
      type: 'input',
      block_id: `extra_${i}_name`,
      optional: true,
      label: { type: 'plain_text', text: `Завдання ${i} - назва` },
      element: {
        type: 'plain_text_input',
        action_id: 'value',
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
    private_metadata: JSON.stringify({ taskIds: tasks.map((t) => t.id), weekKey, simpleExtraCount }),
    title: { type: 'plain_text', text: 'Тижневий звіт' },
    submit: { type: 'plain_text', text: 'Надіслати' },
    close: { type: 'plain_text', text: 'Скасувати' },
    blocks
  };
}

module.exports = { buildWeeklyReportModal, WIG_NONE_VALUE };
