const cron = require('node-cron');
const db = require('./db');
const { getWeekRange } = require('./config/dates');

// По умолчанию - пятница 15:00. Меняется через .env (WEEKLY_REPORT_CRON)
function startScheduler(app) {
  const cronExpr = process.env.WEEKLY_REPORT_CRON || '0 15 * * 5';

  cron.schedule(cronExpr, async () => {
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
  });

  console.log(`Планувальник запущено: "${cronExpr}"`);
}

module.exports = { startScheduler };
