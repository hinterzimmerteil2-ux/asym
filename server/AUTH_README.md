# Auth — configuración

Este proyecto soporta 3 formas de entrar: Google, Discord, o invitado sin
cuenta. Invitado funciona sin configuración extra. Google y Discord
necesitan que generes credenciales en sus paneles — no hay forma de que
esto funcione con datos de ejemplo, son credenciales reales atadas a tu
dominio.

## 1. Base de datos

Si desplegás con el `render.yaml` incluido, la base Postgres se crea sola y
se conecta automáticamente (`DATABASE_URL` se completa sin que hagas nada).

En desarrollo local, necesitás una Postgres corriendo y pasarle la URL:
```bash
export DATABASE_URL="postgresql://usuario:password@localhost:5432/tu_db"
```
Las tablas se crean solas al arrancar el server (`initSchema()` corre en
cada arranque, es seguro porque usa `CREATE TABLE IF NOT EXISTS`).

## 2. JWT_SECRET

Cualquier string largo y random sirve. Generarlo:
```bash
openssl rand -hex 32
```
En Render: Environment > Add Environment Variable > `JWT_SECRET`.
En local: agregalo a tu `.env` o exportalo antes de correr el server.

**Sin esto en producción, el server rechaza arrancar** (a propósito — ver
`jwt.js`, es una protección para no correr con el secreto de desarrollo).

## 3. Google OAuth

1. Andá a [Google Cloud Console](https://console.cloud.google.com/) y creá
   un proyecto nuevo (o usá uno existente).
2. **APIs y servicios > Pantalla de consentimiento de OAuth**: configurala
   como "Externa", completá nombre de la app y tu email de contacto.
3. **APIs y servicios > Credenciales > Crear credenciales > ID de cliente
   de OAuth**.
4. Tipo de aplicación: **Aplicación web**.
5. En **Orígenes de JavaScript autorizados**, agregá la URL de tu cliente
   en Vercel (ej. `https://tu-juego.vercel.app`) y, para desarrollo local,
   `http://localhost:3000`.
6. En **URIs de redireccionamiento autorizados**, agregá la URL de tu
   servidor en Render seguida de `/auth/callback/google`
   (ej. `https://tu-servidor.onrender.com/auth/callback/google`), y para
   desarrollo local `http://localhost:3001/auth/callback/google`.
7. Creá, copiá el **Client ID** y el **Client Secret**.
8. Cargalos como `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en las
   variables de entorno del server (Render o tu `.env` local).

## 4. Discord OAuth

1. Andá al [Discord Developer Portal](https://discord.com/developers/applications)
   y creá una aplicación nueva.
2. En la sección **OAuth2 > General**, copiá el **Client ID** y generá/copiá
   el **Client Secret**.
3. En **Redirects**, agregá la URL de tu servidor en Render seguida de
   `/auth/callback/discord` (ej.
   `https://tu-servidor.onrender.com/auth/callback/discord`), y para
   desarrollo local `http://localhost:3001/auth/callback/discord`.
4. Guardá los cambios.
5. Cargá los valores como `DISCORD_CLIENT_ID` y `DISCORD_CLIENT_SECRET`.

## 5. URLs del propio proyecto

Dos variables más, que apuntan a tus propios servicios (no a Google/Discord):

- `SERVER_URL`: la URL pública de este servidor en Render (ej.
  `https://tu-servidor.onrender.com`). Se usa para armar el redirect_uri
  que le mandamos a Google/Discord — tiene que ser EXACTAMENTE la misma
  que registraste en sus paneles arriba, si no da `redirect_uri_mismatch`.
- `CLIENT_URL`: la URL de tu cliente en Vercel (ej.
  `https://tu-juego.vercel.app`). Se usa para redirigir de vuelta al
  usuario después de un login exitoso o fallido.

En desarrollo local, los defaults ya apuntan a `localhost:3001` y
`localhost:3000` — no hace falta configurarlos a mano salvo que uses
otros puertos.

## Resumen: las 8 variables de entorno del server

| Variable | De dónde sale |
|---|---|
| `DATABASE_URL` | Automática si usás `render.yaml`; a mano en local |
| `JWT_SECRET` | Generada por vos (`openssl rand -hex 32`) |
| `SERVER_URL` | La URL de este mismo servicio en Render |
| `CLIENT_URL` | La URL de tu cliente en Vercel |
| `GOOGLE_CLIENT_ID` | Panel de Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Panel de Google Cloud Console |
| `DISCORD_CLIENT_ID` | Panel de Discord Developer Portal |
| `DISCORD_CLIENT_SECRET` | Panel de Discord Developer Portal |

## Cómo se prueba que esto funciona (lo que ya validamos)

El flujo de invitado (sin OAuth) se probó de punta a punta contra una
Postgres real: `POST /auth/guest` devuelve un JWT válido, y ese token se
verificó correctamente al hacer `join_room` por WebSocket — el server
extrae el `playerId` y `displayName` del token en vez de confiar en lo que
mande el cliente.

El flujo de Google/Discord usa los endpoints oficiales de cada proveedor
(confirmados contra su documentación al momento de escribir esto), pero
**no se puede probar sin credenciales reales** — es la parte que te toca
verificar a vos una vez que cargues tus propias `CLIENT_ID`/`CLIENT_SECRET`.
Si algo falla ahí, el mensaje de error más común es
`redirect_uri_mismatch`, que casi siempre significa que la URL en el panel
del proveedor no coincide carácter por carácter con `SERVER_URL` + el path
de callback.
