const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { DEFAULT_STAGES } = require('../config/defaultStages');

function registerAppSetDefaultStages(app) {
  app.command('/app-set-default-stages', async ({ ack, respond }) => {
    await ack();

    const apps = db.get('apps').value();
    let updated = 0;
    let skipped = 0;

    apps.forEach((appRecord) => {
      if (appRecord.stages.length > 0) {
        skipped += 1;
        return;
      }

      const stages = DEFAULT_STAGES.map((name, idx) => ({
        id: uuidv4(),
        name,
        order: idx
      }));

      db.get('apps').find({ id: appRecord.id }).assign({ stages }).write();
      updated += 1;
    });

    await respond(
      `Готово. Проставлено дефолтні етапи для *${updated}* додатків` +
        (skipped > 0 ? `, пропущено ${skipped} (у них вже були свої етапи).` : '.')
    );
  });
}

module.exports = { registerAppSetDefaultStages };
