require('dotenv').config();
const { App } = require('@slack/bolt');

const { registerTaskAdd } = require('./commands/taskAdd');
const { registerEmployeeAdd } = require('./commands/employees');
const { registerWeeklyReport } = require('./commands/weeklyReport');
const { registerTeamReport } = require('./commands/teamReport');
const { registerAppAdd } = require('./commands/appAdd');
const { registerAppImport } = require('./commands/appImport');
const { registerAppSetStages } = require('./commands/appSetStages');
const { registerAppSetDefaultStages } = require('./commands/appSetDefaultStages');
const { registerAppProgress } = require('./commands/appProgress');
const { registerAppList } = require('./commands/appList');
const { registerAppAssign } = require('./commands/appAssign');
const { registerTaskList } = require('./commands/taskList');
const { registerTaskDelete } = require('./commands/taskDelete');
const { registerAppPlan } = require('./commands/appPlan');
const { registerTestWeeklyReport } = require('./commands/testWeeklyReport');
const { startScheduler } = require('./scheduler');
const { startDashboard } = require('./dashboardServer');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

registerTaskAdd(app);
registerEmployeeAdd(app);
registerWeeklyReport(app);
registerTeamReport(app);
registerAppAdd(app);
registerAppImport(app);
registerAppSetStages(app);
registerAppSetDefaultStages(app);
registerAppProgress(app);
registerAppList(app);
registerAppAssign(app);
registerTaskList(app);
registerTaskDelete(app);
registerAppPlan(app);
registerTestWeeklyReport(app);

(async () => {
  await app.start();
  startScheduler(app);
  startDashboard();
  console.log('PM weekly report bot запущено');
})();
