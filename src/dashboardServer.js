// Express-сервер дашборда, винесений в окрему функцію, щоб його можна було
// запускати як окремий процес (npm run dashboard, для локальної розробки)
// АБО всередині одного процесу разом з ботом (для деплою на Railway/Render,
// щоб обидва компоненти дивились на один і той самий data/db.json).

const express = require('express');
const path = require('path');
const db = require('./db');
const { buildGanttData } = require('./gantt');

function startDashboard() {
  const app = express();
  // Railway/Render самі задають PORT через змінну середовища -
  // локально використовуємо DASHBOARD_PORT або 4000.
  const PORT = process.env.PORT || process.env.DASHBOARD_PORT || 4000;

  app.use(express.static(path.join(__dirname, '..', 'dashboard', 'public')));

  app.get('/api/gantt', (req, res) => {
    const data = buildGanttData(db);
    res.json(data);
  });

  app.listen(PORT, () => {
    console.log(`Дашборд доступний на порту ${PORT}`);
  });
}

module.exports = { startDashboard };
