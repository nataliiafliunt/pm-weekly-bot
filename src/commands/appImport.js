const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { buildAppImportModal } = require('../blocks/appImportModal');
const { DEFAULT_STAGES } = require('../config/defaultStages');

function findEmployeeBySurname(employees, surname) {
  const needle = surname.trim().toLowerCase();
  if (!needle) return null;

  const matches = employees.filter((e) => e.name.toLowerCase().includes(needle));
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) return '__ambiguous__';
  return null;
}

function registerAppImport(app) {
  app.command('/app-import', async ({ ack, body, client }) => {
    await ack();
    await client.views.open({
      trigger_id: body.trigger_id,
      view: buildAppImportModal()
    });
  });

  app.view('app_import_submit', async ({ ack, view, body, client }) => {
    await ack();

    const rawText = view.state.values.import_text.value.value;
    const employees = db.get('employees').value();
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

    const grouped = new Map();
    const notFound = [];
    const ambiguous = [];

    for (const line of lines) {
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length < 3) continue;

      const [category, job, pmField] = parts;
      const appName = job || category;
      const key = `${category}::${appName}`;

      if (!grouped.has(key)) {
        grouped.set(key, { category, name: appName, assignees: new Set() });
      }
      const entry = grouped.get(key);

      const surnames = pmField.split(',').map((s) => s.trim()).filter(Boolean);
      for (const surname of surnames) {
        const emp = findEmployeeBySurname(employees, surname);
        if (emp === '__ambiguous__') {
          ambiguous.push(surname);
        } else if (emp === null) {
          notFound.push(surname);
        } else {
          entry.assignees.add(emp.slackId);
        }
      }
    }

    const createdApps = [];
    for (const entry of grouped.values()) {
      const stages = DEFAULT_STAGES.map((name, idx) => ({ id: uuidv4(), name, order: idx }));

      const appRecord = {
        id: uuidv4(),
        name: entry.name,
        category: entry.category,
        stages,
        assignees: Array.from(entry.assignees),
        createdBy: body.user.id,
        createdAt: new Date().toISOString()
      };
      db.get('apps').push(appRecord).write();
      createdApps.push(appRecord.name);
    }

    let summary = `Імпортовано додатків: *${createdApps.length}*\n${createdApps.map((n) => `• ${n}`).join('\n')}`;
    summary += '\n\n_Усім проставлено стандартний набір етапів. Змінити для конкретного додатку - /app-set-stages._';

    if (notFound.length > 0) {
      summary += `\n\n⚠️ Не знайдено співробітників (додай через /employee-add): ${[...new Set(notFound)].join(', ')}`;
    }
    if (ambiguous.length > 0) {
      summary += `\n\n⚠️ Декілька збігів за прізвищем, призначено вручну: ${[...new Set(ambiguous)].join(', ')}`;
    }

    await client.chat.postMessage({ channel: body.user.id, text: summary });
  });
}

module.exports = { registerAppImport };
