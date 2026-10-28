// Base de datos SQLite (módulo nativo de Node 22: node:sqlite). Un solo archivo: data.db
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(process.env.DB_PATH || path.join(__dirname, 'data.db'));
db.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY, usuario TEXT UNIQUE NOT NULL, hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'mecanico' CHECK (rol IN ('admin','mecanico')));
CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, telefono TEXT, creado TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS vehiculos (
  patente TEXT PRIMARY KEY, cliente_id INTEGER REFERENCES clientes(id),
  marca TEXT, modelo TEXT, anio INTEGER, aceite TEXT,
  comprado_en_agencia INTEGER NOT NULL DEFAULT 0, plan TEXT, creado TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY, patente TEXT NOT NULL REFERENCES vehiculos(patente) ON DELETE CASCADE,
  fecha TEXT NOT NULL, km INTEGER, aceite TEXT, filtros TEXT,
  checklist TEXT, observaciones TEXT, prox_km INTEGER, prox_fecha TEXT,
  usuario_id INTEGER REFERENCES usuarios(id), creado TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS ix_services_patente ON services (patente, fecha);
`);
module.exports = db;
