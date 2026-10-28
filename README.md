# Black Cars · Sistema de fichas y services

Sistema web para la agencia **Black Cars** y su lubricentro (Tandil). Cada auto tiene una **ficha por patente** con su cliente y el **historial de services**, un **checklist semáforo de 12 puntos** (OK / Pronto / Urgente) y una lista de **próximos a avisar por WhatsApp**.

Es la versión 0.1: funciona de punta a punta, pero está pensada para que la continúe alguien de sistemas.

## Cómo correrlo
Requiere **Node 22.13 o superior**.
```bash
npm install
node crear-usuario.js dueño UnaClaveLarga admin      # crea el primer usuario
node crear-usuario.js taller OtraClave mecanico      # uno por persona
npm start                                            # http://localhost:3000
```
Variables de entorno: `ADMIN_USER` y `ADMIN_PASS` (si la base no tiene usuarios, crean el administrador al arrancar; útil en hostings sin terminal), `PORT`, `SESSION_SECRET` (obligatoria en producción, una cadena larga y secreta), `DB_PATH` (ruta de la base), `NODE_ENV=production` (cookie `Secure`, requiere HTTPS).

## Estructura
- `server.js` — API REST (Express) y archivos estáticos.
- `db.js` — esquema SQLite (`data.db`, se crea sola). `auth.js` — login y sesiones. `crear-usuario.js` — alta de usuarios.
- `public/` — front-end sin frameworks (`index.html`, `app.js`, `styles.css`).

## Modelo de datos
`usuarios` (rol admin o mecanico) · `clientes` (nombre, teléfono) · `vehiculos` (clave: patente; marca, modelo, año, aceite, si se compró en la agencia, plan) · `services` (fecha, km, aceite, filtros, checklist en JSON, observaciones, próximo service por km y fecha).

## API (todo requiere sesión salvo login)
`POST /api/login` · `POST /api/logout` · `GET /api/me`
`GET|POST /api/vehiculos` · `GET|PUT|DELETE /api/vehiculos/:patente`
`POST /api/vehiculos/:patente/services` · `DELETE /api/services/:id`
`GET /api/recordatorios`
Borrar autos y services es solo para `admin`.

## Pendientes para quien lo continúe
1. **Publicarlo**: hosting con HTTPS y dominio, y **backups automáticos de `data.db`**. Ojo: la base es un archivo, así que el hosting necesita disco persistente (en planes gratis suele borrarse). Un VPS chico o un disco pago funcionan.
2. **Seguridad**: límite de intentos de login, protección CSRF, cambio de clave desde la app, auditoría de quién cambió qué.
3. **Datos**: importar clientes y autos desde Excel; evitar clientes duplicados (hoy se unifican por teléfono); migrar a PostgreSQL si crece.
4. **Avisos**: hoy se arma el mensaje y se abre WhatsApp a mano. Falta automatizarlo (API oficial de WhatsApp Business) y avisar también por kilómetros.
5. **Negocio**: planes de mantenimiento y suscripciones con cobro, vínculo con el stock de autos de la agencia, turnos online, remito o informe PDF con fotos, reseñas en Google.
6. **Calidad**: tests automáticos, validaciones más estrictas, pantalla de administración de usuarios.
