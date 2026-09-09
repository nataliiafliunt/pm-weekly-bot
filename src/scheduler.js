const cron = require('node-cron');
const db = require('./db');
const { getWeekRange } = require('./config/dates');

// По умолчанию - пятница 15:00 за київським часом. Меняется через .env (WEEKLY_REPORT_CRON)
// ВАЖЛИВО: явно вказуємо timezone, інакше на хостингу (Railway/Render) сервер
// працює за UTC, і час у cron буде "з'їжджати" на 2-3 години від київського.
function startScheduler(app) {
  const cronExpr = process.env.WEEKLY_REPORT_CRON || '0 15 * * 5';
  const timezone = process.env.CRON_TIMEZONE || 'Europe/Kyiv';

  cron.schedule(
    cronExpr,
    async () => {
    const week = getWeekRange();
    const employees = db.get('employees').value();

    for (const emp of employees) {
      try {
        await app.client.chat.postMessage({
          channel: emp.slackId,
          text: 'Час заповнити тижневий звіт по годинах на розробку/навчання.',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Привіт! Час заповнити тижневий звіт (тиждень ${week.key}).`
              }
            },
            {
              type: 'actions',
              block_id: 'open_report',
              elements: [
                {
                  type: 'button',
                  action_id: 'open_weekly_report',
                  text: { type: 'plain_text', text: 'Заповнити звіт' },
                  value: JSON.stringify({ weekKey: week.key })
                }
              ]
            }
          ]
        });
      } catch (err) {
        console.error(`Не вдалося написати ${emp.name}:`, err.message);
      }
    }
    },
    { timezone }
  );

  console.log(`Планувальник запущено: "${cronExpr}" (${timezone})`);
}

module.exports = { startScheduler };
