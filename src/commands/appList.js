const db = require('../db');

function registerAppList(app) {
  app.command('/app-list', async ({ ack, respond }) => {
    await ack();

    const apps = db.get('apps').value();
    const employees = db.get('employees').value();

    if (apps.length === 0) {
      await respond('Ще немає жодного додатку. Створи через /app-add або /app-import.');
      return;
    }

    const byCategory = {};
    apps.forEach((a) => {
      if (!byCategory[a.category]) byCategory[a.category] = [];
      byCategory[a.category].push(a);
    });

    let text = '';
    for (const [category, list] of Object.entries(byCategory)) {
      text += `*${category}*\n`;
      list.forEach((a) => {
        const names = a.assignees
          .map((id) => employees.find((e) => e.slackId === id)?.name || id)
          .join(', ');
        const stages = a.stages.length > 0 ? a.stages.map((s) => s.name).join(' → ') : '_етапи не задані_';
        text += `• ${a.name} — ${names || '_немає відповідальних_'}\n   ${stages}\n`;
      });
      text += '\n';
    }

    await respond({ text, response_type: 'ephemeral' });
  });
}

module.exports = { registerAppList };
