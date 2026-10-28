// Front-end sin frameworks: cada pantalla es una función que arma el DOM y llama a la API (/api/...).
const $ = s => document.querySelector(s);
const el = (t, a, ...k) => {
  const e = document.createElement(t);
  for (const x in a || {}) { const v = a[x]; if (x === 'class') e.className = v; else if (x.slice(0, 2) === 'on') e[x] = v; else if (v !== false && v != null) e.setAttribute(x, v); }
  k.flat(9).forEach(c => { if (c !== false && c != null) e.append(c.nodeType ? c : document.createTextNode(String(c))); });
  return e;
};
const ITEMS = ['Nivel de aceite', 'Filtro de aceite', 'Filtro de aire', 'Filtro de habitáculo', 'Líquido de frenos', 'Refrigerante', 'Batería', 'Luces', 'Neumáticos', 'Frenos', 'Correas', 'Escobillas'];
let me = null, mt;
const hoy = () => new Date().toLocaleDateString('en-CA');
const fd = s => (s ? s.split('-').reverse().join('/') : '');
const nk = n => (n == null || n === '' ? '' : Number(n).toLocaleString('es-AR'));
const fld = (l, i) => el('label', { class: 'f' }, el('span', {}, l), i);
const mk = (o, v) => Object.assign(el('input', o), { value: v == null ? '' : v });
const flash = t => { $('#msg').textContent = t; clearTimeout(mt); mt = setTimeout(() => { $('#msg').textContent = ''; }, 5000); };
const show = (...k) => { $('#v').replaceChildren(...k.flat().filter(Boolean)); window.scrollTo(0, 0); };
const run = async f => { try { await f(); } catch (e) { flash(e.message); } };
async function api(m, u, b) {
  const r = await fetch('/api' + u, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && u !== '/login') { me = null; login(); throw new Error('Iniciá sesión de nuevo'); }
  if (!r.ok) throw new Error(d.error || 'Error');
  return d;
}
function danger(lbl, fn) {
  const b = el('button', { class: 'btn dng', type: 'button' }, lbl); let t;
  b.onclick = () => { if (b.dataset.s) { clearTimeout(t); fn(); return; } b.dataset.s = 1; b.textContent = '¿Seguro? Tocá de nuevo'; t = setTimeout(() => { delete b.dataset.s; b.textContent = lbl; }, 4000); };
  return b;
}
function wa(r) {
  const d = String(r.telefono || '').replace(/\D/g, '');
  const cuando = [r.prox_km && nk(r.prox_km) + ' km', r.prox_fecha && fd(r.prox_fecha)].filter(Boolean).join(' o ');
  const msg = `Hola ${r.nombre || ''}, te escribimos de Black Cars. Tu ${[r.marca, r.modelo].filter(Boolean).join(' ')} (${r.patente}) tiene el próximo service a los ${cuando}. ¿Querés que te saquemos un turno?`;
  return d ? 'https://wa.me/' + d + '?text=' + encodeURIComponent(msg) : null;
}

function login() {
  $('#out').hidden = true;
  const u = mk({ placeholder: 'Usuario', autocomplete: 'username' }), c = mk({ type: 'password', placeholder: 'Clave', autocomplete: 'current-password' });
  const go = () => run(async () => { me = await api('POST', '/login', { usuario: u.value, clave: c.value }); lista(); });
  c.onkeydown = e => { if (e.key === 'Enter') go(); };
  show(el('h1', {}, 'Ingresar'), el('div', { class: 'g' }, fld('Usuario', u), fld('Clave', c)), el('button', { class: 'btn', onclick: go }, 'Entrar'));
}
function lista() {
  $('#out').hidden = false;
  const res = el('div'), s = mk({ type: 'search', placeholder: 'Buscar por patente, nombre o teléfono', autocapitalize: 'characters', 'aria-label': 'Buscar' });
  let t;
  const cargar = () => run(async () => {
    const L = await api('GET', '/vehiculos?q=' + encodeURIComponent(s.value));
    res.replaceChildren(el('p', { class: 'mu' }, L.length + ' resultado(s)'),
      ...L.map(v => el('button', { class: 'card', onclick: () => ficha(v.patente) },
        el('div', { class: 'pt' }, v.patente), el('div', {}, [v.marca, v.modelo, v.anio].filter(Boolean).join(' ') || 'Sin datos del auto'),
        el('div', { class: 'mu' }, v.nombre || 'Sin nombre'), v.ultimo_service && el('div', { class: 'mu' }, 'Último service: ' + fd(v.ultimo_service)))),
      !L.length && s.value && el('button', { class: 'btn sec', onclick: () => formAuto({ patente: s.value.toUpperCase() }) }, 'Cargar ' + s.value.toUpperCase() + ' como auto nuevo'));
  });
  s.oninput = () => { clearTimeout(t); t = setTimeout(cargar, 250); };
  show(el('div', { class: 'row' }, el('button', { class: 'btn', onclick: () => formAuto({}) }, '+ Nuevo auto'), el('button', { class: 'btn sec', onclick: avisos }, 'Próximos a avisar')), el('div', { class: 'bar' }, s), res);
  cargar();
}
function avisos() {
  run(async () => {
    const L = await api('GET', '/recordatorios');
    show(el('button', { class: 'lnk', onclick: lista }, '← Volver'), el('h1', {}, 'Próximos a avisar'), el('p', { class: 'mu' }, 'Vencidos o con próximo service en los siguientes 30 días.'),
      !L.length && el('p', {}, 'No hay nadie para avisar por ahora.'),
      L.map(r => { const l = wa(r); return el('div', { class: 'box' }, el('div', { class: 'row sb' }, el('strong', {}, r.patente), el('span', { class: r.vencido ? 'late' : 'mu' }, (r.vencido ? 'Vencido · ' : '') + fd(r.prox_fecha))),
        el('div', {}, [r.marca, r.modelo].filter(Boolean).join(' ') + ' · ' + (r.nombre || 'Sin nombre')),
        l ? el('a', { class: 'btn', href: l, target: '_blank', rel: 'noopener' }, 'Avisar por WhatsApp') : el('span', { class: 'mu' }, 'Sin teléfono cargado')); }));
  });
}
function ficha(p) {
  run(async () => {
    const v = await api('GET', '/vehiculos/' + encodeURIComponent(p));
    show(el('button', { class: 'lnk', onclick: lista }, '← Volver'),
      el('div', { class: 'row' }, el('h1', { class: 'pt' }, v.patente), v.comprado_en_agencia ? el('span', { class: 'pill' }, 'Compró en Black Cars') : null),
      el('div', { class: 'mu' }, [v.marca, v.modelo, v.anio].filter(Boolean).join(' ') || 'Sin datos del auto'),
      el('div', { class: 'box' }, el('strong', {}, v.nombre || 'Sin nombre'),
        v.telefono && el('div', { class: 'row' }, el('a', { href: 'tel:' + v.telefono }, v.telefono), el('a', { href: 'https://wa.me/' + v.telefono.replace(/\D/g, ''), target: '_blank', rel: 'noopener' }, 'WhatsApp')),
        v.aceite && el('div', { class: 'mu' }, 'Aceite: ' + v.aceite), v.plan && el('div', { class: 'mu' }, 'Plan: ' + v.plan)),
      el('div', { class: 'row' }, el('button', { class: 'btn', onclick: () => formService(v) }, '+ Nuevo service'), el('button', { class: 'btn sec', onclick: () => formAuto(v) }, 'Editar ficha'),
        me.rol === 'admin' && danger('Eliminar auto', () => run(async () => { await api('DELETE', '/vehiculos/' + v.patente); lista(); }))),
      el('h2', {}, 'Historial (' + v.services.length + ')'),
      !v.services.length && el('p', { class: 'mu' }, 'Todavía no hay services cargados.'),
      v.services.map(s => {
        const e = Object.entries(s.checklist), ok = e.filter(([, x]) => x === 'ok').length;
        return el('div', { class: 'box' }, el('div', { class: 'row sb' }, el('strong', {}, fd(s.fecha)), el('span', {}, nk(s.km) && nk(s.km) + ' km')),
          s.aceite && el('div', {}, 'Aceite: ' + s.aceite), s.filtros && el('div', {}, 'Filtros: ' + s.filtros),
          e.length ? el('div', {}, el('span', { class: 'chip' }, ok + ' puntos OK'), e.filter(([, x]) => x !== 'ok').map(([k, x]) => el('span', { class: 'chip ' + x }, k + ': ' + x))) : null,
          s.observaciones && el('div', { class: 'mu' }, s.observaciones),
          (s.prox_km || s.prox_fecha) && el('div', { class: 'mu' }, 'Próximo: ' + [s.prox_km && nk(s.prox_km) + ' km', s.prox_fecha && fd(s.prox_fecha)].filter(Boolean).join(' o ')),
          me.rol === 'admin' && el('div', { class: 'row' }, danger('Borrar service', () => run(async () => { await api('DELETE', '/services/' + s.id); ficha(v.patente); }))));
      }));
  });
}
function formAuto(v) {
  const ed = !!v.creado;
  const f = { patente: mk({ placeholder: 'AB123CD', autocapitalize: 'characters', maxlength: 10, disabled: ed }, v.patente), nombre: mk({ placeholder: 'Nombre y apellido' }, v.nombre), telefono: mk({ type: 'tel', placeholder: 'Ej: 5492494123456' }, v.telefono),
    marca: mk({}, v.marca), modelo: mk({}, v.modelo), anio: mk({ type: 'number' }, v.anio), aceite: mk({ placeholder: 'Ej: 5W-30 sintético' }, v.aceite), plan: mk({ placeholder: 'Ej: Pack 3 services' }, v.plan),
    ag: Object.assign(el('input', { type: 'checkbox' }), { checked: !!v.comprado_en_agencia }) };
  const guardar = () => run(async () => {
    const b = { patente: f.patente.value, nombre: f.nombre.value, telefono: f.telefono.value, marca: f.marca.value, modelo: f.modelo.value, anio: f.anio.value, aceite: f.aceite.value, plan: f.plan.value, agencia: f.ag.checked };
    if (ed) { await api('PUT', '/vehiculos/' + v.patente, b); ficha(v.patente); } else { const r = await api('POST', '/vehiculos', b); ficha(r.patente); }
  });
  show(el('button', { class: 'lnk', onclick: () => (ed ? ficha(v.patente) : lista()) }, '← Cancelar'), el('h1', {}, ed ? 'Editar ficha' : 'Nuevo auto'),
    el('div', { class: 'g' }, fld('Patente *', f.patente), fld('Cliente', f.nombre), fld('Teléfono (WhatsApp, con código de país)', f.telefono), fld('Marca', f.marca), fld('Modelo', f.modelo), fld('Año', f.anio), fld('Tipo de aceite', f.aceite), fld('Plan de mantenimiento', f.plan)),
    el('label', { class: 'row' }, f.ag, 'Lo compró en la agencia Black Cars'), el('button', { class: 'btn', onclick: guardar }, 'Guardar'));
}
function formService(v) {
  const f = { fecha: mk({ type: 'date' }, hoy()), km: mk({ type: 'number' }), aceite: mk({}, v.aceite), filtros: mk({ placeholder: 'Aceite, aire, habitáculo…' }), prox_km: mk({ type: 'number' }), prox_fecha: mk({ type: 'date' }), obs: el('textarea', { rows: 3 }) };
  const op = (i, val, lbl) => el('label', { class: 'op' }, el('input', { type: 'radio', name: 'i' + i, value: val }), lbl);
  const guardar = () => run(async () => {
    const checklist = {}; ITEMS.forEach((k, i) => { const r = document.querySelector(`input[name=i${i}]:checked`); if (r) checklist[k] = r.value; });
    await api('POST', '/vehiculos/' + v.patente + '/services', { fecha: f.fecha.value, km: f.km.value, aceite: f.aceite.value, filtros: f.filtros.value, observaciones: f.obs.value, prox_km: f.prox_km.value, prox_fecha: f.prox_fecha.value, checklist });
    ficha(v.patente);
  });
  show(el('button', { class: 'lnk', onclick: () => ficha(v.patente) }, '← Cancelar'), el('h1', {}, 'Nuevo service'), el('div', { class: 'mu' }, v.patente + ' · ' + (v.nombre || 'Sin nombre')),
    el('div', { class: 'g' }, fld('Fecha *', f.fecha), fld('Kilómetros', f.km), fld('Aceite usado', f.aceite), fld('Filtros cambiados', f.filtros), fld('Próximo service (km)', f.prox_km), fld('Próximo service (fecha)', f.prox_fecha)),
    el('h2', {}, 'Revisión de 12 puntos'), el('p', { class: 'mu' }, 'Marcá solo lo que se revisó.'),
    el('div', { class: 'cl' }, ITEMS.map((k, i) => [el('span', {}, k), op(i, 'ok', 'OK'), op(i, 'pronto', 'Pronto'), op(i, 'urgente', 'Urgente')])),
    fld('Observaciones', f.obs), el('div', { class: 'row' }, el('button', { class: 'btn', onclick: guardar }, 'Guardar service')));
}
$('#out').onclick = () => run(async () => { await api('POST', '/logout'); me = null; login(); });
run(async () => { me = await api('GET', '/me').catch(() => null); if (me) lista(); else login(); });
