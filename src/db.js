// Простое JSON-хранилище для MVP.
// Когда данных станет много - можно заменить на Postgres/Airtable,
// поменяв только этот файл (интерфейс db.get(...) используется во всех командах).

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const fs = require('fs');
const path = require('path');

// Git не сохраняет пустые папки, поэтому на чистом деплое (Railway/Render)
// папки data может не существовать вообще - создаём её сами при старте,
// иначе lowdb упадёт с ошибкой ENOENT при попытке записать файл.
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const adapter = new FileSync(path.join(dataDir, 'db.json'));
const db = low(adapter);

db.defaults({ employees: [], tasks: [], reports: [], apps: [], appProgress: [] }).write();

module.exports = db;
