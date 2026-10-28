// Login simple: clave con scrypt + cookie firmada (HMAC). Definir SESSION_SECRET en producción.
const crypto = require('crypto');
const SECRET = process.env.SESSION_SECRET || 'dev-secret-cambiar-en-produccion';
const hmac = b => crypto.createHmac('sha256', SECRET).update(b).digest('base64url');

const hashClave = c => { const s = crypto.randomBytes(16).toString('hex'); return s + ':' + crypto.scryptSync(c, s, 32).toString('hex'); };
const checkClave = (c, h) => {
  const [s, k] = String(h).split(':'); if (!s || !k) return false;
  const x = crypto.scryptSync(c, s, 32), y = Buffer.from(k, 'hex');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const firmar = p => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return b + '.' + hmac(b); };
const leer = t => {
  try {
    const [b, f] = String(t).split('.'), e = hmac(b);
    if (!f || f.length !== e.length || !crypto.timingSafeEqual(Buffer.from(f), Buffer.from(e))) return null;
    const p = JSON.parse(Buffer.from(b, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
};
const sesion = (req, res, next) => {
  const c = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('sid='));
  req.user = c ? leer(c.slice(4)) : null; next();
};
const requiere = rol => (req, res, next) =>
  !req.user ? res.status(401).json({ error: 'No autenticado' })
  : rol && req.user.rol !== rol ? res.status(403).json({ error: 'Sin permiso' }) : next();

module.exports = { hashClave, checkClave, firmar, sesion, requiere };
