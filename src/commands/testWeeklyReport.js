const { sendWeeklyReportPrompt } = require('../scheduler');

function registerTestWeeklyReport(app) {
  app.command('/test-weekly-report', async ({ ack, respond }) => {
    await ack();
    await sendWeeklyReportPrompt(app);
    await respond('Розіслано. Перевір особисті повідомлення.');
  });
}

module.exports = { registerTestWeeklyReport };
