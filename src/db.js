// Простое JSON-хранилище для MVP.
// Когда данных станет много - можно заменить на Postgres/Airtable,
// поменяв только этот файл (интерфейс db.get(...) используется во всех командах).

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const adapter = new FileSync(path.join(__dirname, '..', 'data', 'db.json'));
const db = low(adapter);

db.defaults({ employees: [], tasks: [], reports: [], apps: [], appProgress: [] }).write();

module.exports = db;
