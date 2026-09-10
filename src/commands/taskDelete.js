const db = require('../db');

// Формат: /task-delete частина тексту завдання
// Видаляє всі завдання, текст яких містить цей фрагмент (без урахування регістру).
function registerTaskDelete(app) {
  app.command('/task-delete', async ({ ack, command, respond }) => {
    await ack();

    const query = command.text.trim();
    if (!query) {
      await respond('Формат: /task-delete частина тексту завдання (подивись точний текст через /task-list)');
      return;
    }

    const tasks = db.get('tasks').value();
    const matching = tasks.filter((t) => t.text.toLowerCase().includes(query.toLowerCase()));

    if (matching.length === 0) {
      await respond(`Не знайдено завдань з текстом "${query}". Перевір через /task-list.`);
      return;
    }

    db.get('tasks').remove((t) => t.text.toLowerCase().includes(query.toLowerCase())).write();

    const names = matching.map((t) => `«${t.text}»`).join(', ');
    await respond(`Видалено ${matching.length} завдань(я): ${names}`);
  });
}

module.exports = { registerTaskDelete };
