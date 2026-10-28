// API REST + archivos estáticos. Toda la API requiere sesión salvo /api/login.
const express = require('express');
const path = require('path');
const db = require('./db');
const { hashClave, checkClave, firmar, sesion, requiere } = require('./auth');

const app = express();
app.use(express.json());
app.use(sesion);
app.use(express.static(path.join(__dirname, 'public')));

const TZ = 'America/Argentina/Buenos_Aires';
const fecha = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: TZ });
const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const num = x => (x === '' || x == null || isNaN(Number(x)) ? null : Number(x));
const txt = x => (String(x || '').trim() || null);
const err = (res, code, msg) => res.status(code).json({ error: msg });
const VEH = 'SELECT v.*, c.nombre, c.telefono FROM vehiculos v LEFT JOIN clientes c ON c.id = v.cliente_id';

// --- Sesión ---
app.post('/api/login', (req, res) => {
  const u = db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get(String(req.body.usuario || '').trim());
  if (!u || !checkClave(String(req.body.clave || ''), u.hash)) return err(res, 401, 'Usuario o clave incorrectos');
  const me = { id: Number(u.id), usuario: u.usuario, rol: u.rol };
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `sid=${firmar({ ...me, exp: Date.now() + 12 * 3600e3 })}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200${secure}`);
  res.json(me);
});
app.post('/api/logout', (req, res) => { res.setHeader('Set-Cookie', 'sid=; HttpOnly; Path=/; Max-Age=0'); res.json({ ok: true }); });
app.get('/api/me', requiere(), (req, res) => res.json({ id: req.user.id, usuario: req.user.usuario, rol: req.user.rol }));

// --- Vehículos (la patente es la clave) ---
function clienteId(b) {
  const tel = txt(b.telefono);
  const ex = tel && db.prepare('SELECT id FROM clientes WHERE telefono = ?').get(tel);
  if (ex) { if (txt(b.nombre)) db.prepare('UPDATE clientes SET nombre = ? WHERE id = ?').run(txt(b.nombre), ex.id); return Number(ex.id); }
  return Number(db.prepare('INSERT INTO clientes (nombre, telefono) VALUES (?, ?)').run(txt(b.nombre) || 'Sin nombre', tel).lastInsertRowid);
}
app.get('/api/vehiculos', requiere(), (req, res) => {
  const q = String(req.query.q || '').trim(), like = `%${q}%`, pl = norm(q) ? `%${norm(q)}%` : '%~%';
  res.json(db.prepare(`SELECT v.*, c.nombre, c.telefono,
      (SELECT fecha FROM services s WHERE s.patente = v.patente ORDER BY fecha DESC, id DESC LIMIT 1) AS ultimo_service
    FROM vehiculos v LEFT JOIN clientes c ON c.id = v.cliente_id
    WHERE ? = '' OR v.patente LIKE ? OR c.nombre LIKE ? OR c.telefono LIKE ? OR (v.marca || ' ' || v.modelo) LIKE ?
    ORDER BY COALESCE(ultimo_service, '') DESC, v.patente LIMIT 50`).all(q, pl, like, like, like));
});
app.post('/api/vehiculos', requiere(), (req, res) => {
  const b = req.body, p = norm(b.patente);
  if (p.length < 6 || p.length > 7) return err(res, 400, 'Patente inválida');
  if (db.prepare('SELECT 1 FROM vehiculos WHERE patente = ?').get(p)) return err(res, 409, 'Esa patente ya está cargada');
  db.prepare('INSERT INTO vehiculos (patente, cliente_id, marca, modelo, anio, aceite, comprado_en_agencia, plan) VALUES (?,?,?,?,?,?,?,?)')
    .run(p, clienteId(b), txt(b.marca), txt(b.modelo), num(b.anio), txt(b.aceite), b.agencia ? 1 : 0, txt(b.plan));
  res.status(201).json({ patente: p });
});
app.get('/api/vehiculos/:p', requiere(), (req, res) => {
  const v = db.prepare(VEH + ' WHERE v.patente = ?').get(norm(req.params.p));
  if (!v) return err(res, 404, 'No existe esa patente');
  const services = db.prepare('SELECT * FROM services WHERE patente = ? ORDER BY fecha DESC, id DESC').all(v.patente)
    .map(s => ({ ...s, checklist: s.checklist ? JSON.parse(s.checklist) : {} }));
  res.json({ ...v, services });
});
app.put('/api/vehiculos/:p', requiere(), (req, res) => {
  const p = norm(req.params.p), b = req.body;
  if (!db.prepare('SELECT 1 FROM vehiculos WHERE patente = ?').get(p)) return err(res, 404, 'No existe esa patente');
  db.prepare('UPDATE vehiculos SET cliente_id = ?, marca = ?, modelo = ?, anio = ?, aceite = ?, comprado_en_agencia = ?, plan = ? WHERE patente = ?')
    .run(clienteId(b), txt(b.marca), txt(b.modelo), num(b.anio), txt(b.aceite), b.agencia ? 1 : 0, txt(b.plan), p);
  res.json({ ok: true });
});
app.delete('/api/vehiculos/:p', requiere('admin'), (req, res) => {
  db.prepare('DELETE FROM vehiculos WHERE patente = ?').run(norm(req.params.p)); res.json({ ok: true });
});

// --- Services (cada visita al lubricentro) ---
app.post('/api/vehiculos/:p/services', requiere(), (req, res) => {
  const p = norm(req.params.p), b = req.body;
  if (!db.prepare('SELECT 1 FROM vehiculos WHERE patente = ?').get(p)) return err(res, 404, 'No existe esa patente');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.fecha || '')) return err(res, 400, 'Fecha inválida');
  db.prepare('INSERT INTO services (patente, fecha, km, aceite, filtros, checklist, observaciones, prox_km, prox_fecha, usuario_id) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(p, b.fecha, num(b.km), txt(b.aceite), txt(b.filtros), JSON.stringify(b.checklist || {}), txt(b.observaciones), num(b.prox_km), txt(b.prox_fecha), req.user.id);
  res.status(201).json({ ok: true });
});
app.delete('/api/services/:id', requiere('admin'), (req, res) => {
  db.prepare('DELETE FROM services WHERE id = ?').run(Number(req.params.id)); res.json({ ok: true });
});

// --- Recordatorios: autos cuyo último service tiene próxima fecha vencida o dentro de 30 días ---
app.get('/api/recordatorios', requiere(), (req, res) => {
  const limite = fecha(new Date(Date.now() + 30 * 864e5)), hoy = fecha();
  const rows = db.prepare(`SELECT v.patente, v.marca, v.modelo, c.nombre, c.telefono, s.fecha, s.prox_km, s.prox_fecha
    FROM vehiculos v LEFT JOIN clientes c ON c.id = v.cliente_id
    JOIN services s ON s.id = (SELECT id FROM services WHERE patente = v.patente ORDER BY fecha DESC, id DESC LIMIT 1)
    WHERE s.prox_fecha IS NOT NULL AND s.prox_fecha <= ? ORDER BY s.prox_fecha`).all(limite);
  res.json(rows.map(r => ({ ...r, vencido: r.prox_fecha < hoy })));
});

app.use((e, req, res, next) => { console.error(e); err(res, 500, 'Error interno'); });
// Primer usuario: si no hay ninguno y están ADMIN_USER y ADMIN_PASS, se crea el administrador al arrancar.
if (!db.prepare('SELECT 1 FROM usuarios LIMIT 1').get() && process.env.ADMIN_USER && process.env.ADMIN_PASS)
  db.prepare('INSERT INTO usuarios (usuario, hash, rol) VALUES (?, ?, ?)').run(process.env.ADMIN_USER, hashClave(process.env.ADMIN_PASS), 'admin');
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Sistema Black Cars en http://localhost:${port}`));
