// Точка входу для локального запуску ТІЛЬКИ дашборда (npm run dashboard).
// Для деплою на хостинг дашборд стартує разом з ботом всередині src/app.js -
// цей файл використовується лише для локальної розробки окремо від бота.

require('dotenv').config();
const { startDashboard } = require('../src/dashboardServer');

startDashboard();
