const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// Формат: /app-set-stages Назва додатку | Ідея, Дизайн, Розробка, Тест, Реліз
function registerAppSetStages(app) {
  app.command('/app-set-stages', async ({ ack, command, respond }) => {
    await ack();

    const parts = command.text.split('|').map((p) => p.trim());
    if (parts.length < 2) {
      await respond('Формат: /app-set-stages Назва додатку | Етап1, Етап2, Етап3');
      return;
    }

    const [appName, stagesRaw] = parts;
    const appRecord = db
      .get('apps')
      .find((a) => a.name.toLowerCase() === appName.toLowerCase())
      .value();

    if (!appRecord) {
      await respond(`Додаток «${appName}» не знайдено. Перевір назву через /app-list.`);
      return;
    }

    const stages = stagesRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name, idx) => ({ id: uuidv4(), name, order: idx }));

    db.get('apps').find({ id: appRecord.id }).assign({ stages }).write();

    await respond(`Оновлено етапи для «${appRecord.name}»: ${stages.map((s) => s.name).join(' → ')}`);
  });
}

module.exports = { registerAppSetStages };
