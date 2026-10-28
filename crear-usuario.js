// Uso: node crear-usuario.js <usuario> <clave> [admin|mecanico]
const db = require('./db');
const { hashClave } = require('./auth');
const [, , u, c, rol = 'mecanico'] = process.argv;
if (!u || !c || !['admin', 'mecanico'].includes(rol)) { console.log('Uso: node crear-usuario.js <usuario> <clave> [admin|mecanico]'); process.exit(1); }
db.prepare('INSERT INTO usuarios (usuario, hash, rol) VALUES (?, ?, ?) ON CONFLICT(usuario) DO UPDATE SET hash = excluded.hash, rol = excluded.rol').run(u, hashClave(c), rol);
console.log('Usuario listo:', u, '(' + rol + ')');
