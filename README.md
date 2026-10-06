# Juego asimétrico online — servidor + cliente

Arquitectura: servidor WebSocket en Node.js (Render) + cliente Next.js (Vercel).

```
/server   → Node.js + ws puro. Deploy: Render (Web Service, no serverless).
/client   → Next.js. Deploy: Vercel.
```

## Por qué esta separación

Vercel no mantiene procesos vivos con estado — cada request es una función que
se apaga. Un juego con salas y loops de tick necesita un proceso que viva
todo el tiempo con un `Map` en memoria, así que esa parte va en Render como
"Web Service" (proceso persistente), y Vercel se limita al frontend.

## Autenticación

Hay 3 formas de entrar: cuenta de Google, cuenta de Discord, o invitado
temporal sin cuenta. El invitado funciona sin configuración extra; Google y
Discord necesitan credenciales que generás vos en sus paneles —
**ver `server/AUTH_README.md` para los pasos exactos**, incluidas las 8
variables de entorno necesarias.

Sin esas variables configuradas, el server igual arranca y el login de
invitado funciona normalmente — los botones de Google/Discord van a fallar
hasta que cargues las credenciales correspondientes.

## Desarrollo local

**Servidor:**
```bash
cd server
npm install
export DATABASE_URL="postgresql://usuario:password@localhost:5432/tu_db"
export JWT_SECRET="cualquier-string-largo-random"
npm run dev        # arranca en :3001 con --watch
```
Necesitás una Postgres corriendo localmente para esto — ver
`server/AUTH_README.md` sección 1. Sin `DATABASE_URL` el server no arranca
(falla al crear las tablas). Sin `JWT_SECRET`, arranca igual en desarrollo
con un secreto por defecto, pero **no** en producción (`NODE_ENV=production`),
donde directamente rechaza arrancar sin uno propio.

**Cliente:**
```bash
cd client
cp .env.example .env.local   # ya apunta a localhost:3001
npm install
npm run dev        # arranca en :3000
```

Con el server corriendo, abrí `localhost:3000`: vas a ver la pantalla de
login. Entrá como invitado (funciona sin configuración extra) en dos
pestañas distintas con nombres diferentes, unite a la misma sala, y el
primero en entrar queda como rol asimétrico.

Para probar Google/Discord necesitás cargar además las credenciales OAuth
— ver `server/AUTH_README.md` secciones 3 y 4.

## Deploy

### 1. Servidor → Render

- Conectá el repo en Render, elegí la carpeta `server/` como root directory.
- El archivo `server/render.yaml` ya define el servicio (`Web Service`,
  runtime Node, build `npm install`, start `npm start`, health check `/health`).
- Si preferís configurarlo a mano en vez de usar el YAML: root directory
  `server`, build command `npm install`, start command `npm start`.
- Anotá la URL que te da Render (`https://tu-servicio.onrender.com`) — la vas
  a necesitar para el cliente. El WebSocket queda expuesto automáticamente en
  `wss://tu-servicio.onrender.com` (mismo dominio, TLS incluido).

**Importante — plan free de Render:** los servicios free "duermen" tras 15
min de inactividad y tardan ~30-50s en despertar en la siguiente conexión.
Para un juego online real, considerá el plan pago para evitar ese delay en
la primera conexión de cada partida.

### 2. Cliente → Vercel

- Conectá el mismo repo, elegí `client/` como root directory (Vercel detecta
  Next.js automáticamente).
- En **Environment Variables**, agregá las dos:
  ```
  NEXT_PUBLIC_WS_URL=wss://tu-servicio.onrender.com
  NEXT_PUBLIC_SERVER_URL=https://tu-servicio.onrender.com
  ```
  La primera es para la conexión WebSocket (protocolo `wss://`); la segunda
  es para las llamadas HTTP normales de login (`/auth/guest`,
  `/auth/google`, `/auth/discord`), que usan `https://` — mismo servidor,
  dos protocolos distintos según el tipo de comunicación.
- Deploy. Listo.

## Sobre escalar horizontalmente (para más adelante)

Ahora mismo `RoomManager` guarda las salas en memoria del proceso. Si en
algún momento corrés más de una instancia del server en Render (para manejar
más carga), cada instancia va a tener su propio set de salas — dos jugadores
podrían terminar en instancias distintas y no verse. Mientras uses una sola
instancia (plan free o starter con 1 instance) esto no es problema. Si más
adelante necesitás escalar a varias instancias, la solución típica es mover
el estado de las salas a Redis (pub/sub entre instancias) — avisame si
llegás a ese punto y lo armamos.

## Extender el protocolo

Los tipos de mensaje están centralizados en `server/src/protocol.js`
(`MessageType`). El cliente los recibe como string plano en el campo `type`
del JSON — no hace falta compartir el archivo entre server y client, pero
convendría mantenerlos sincronizados a mano si agregás mensajes nuevos.

La lógica de juego real (qué pasa en cada tick, qué acciones existen en fase
de turnos, cuándo cambia de fase) son placeholders en `server/src/Room.js` —
marcados con comentarios `// Placeholder`. Ahí es donde vas a meter las
reglas concretas de tu juego.
