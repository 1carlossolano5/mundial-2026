# 🏆 Mundial 2026 — Guía y Simulador

Página del Mundial 2026: selecciones, estadios, calendario, resultados en vivo y un simulador del torneo. Hecha con **HTML, CSS y JavaScript puro** + tres **funciones serverless de Vercel** que hacen de proxy (cachean respuestas y evitan problemas de CORS) hacia:

- [TheSportsDB](https://www.thesportsdb.com/) — calendario, resultados, escudos y estadísticas.
- **API pública de FIFA** (api.fifa.com, gratis y sin clave) — alineaciones completas (26 jugadores con foto), táctica, técnico, árbitro y minuto a minuto en español.
- **YouTube** (sin clave) — busca el resumen en video de cada partido ya jugado para incrustarlo en el detalle.

Si el sitio se abre sin las funciones `/api` (por ejemplo con **Live Server**), el frontend llama directo a las APIs públicas y todo sigue funcionando.

Proyecto de portafolio de **Carlos Solano**.

## 🔑 API key (opcional)

El sitio funciona **sin configurar nada**: usa la clave pública gratuita de TheSportsDB (`"3"`).

Si tienes una clave Patreon de TheSportsDB (más peticiones y datos), puedes usarla:

1. **Local:** copia `.env.example` a `.env.local` y pega tu clave:
   ```
   SPORTSDB_KEY=tu_clave
   ```
2. **En Vercel:** Settings → Environment Variables → agrega `SPORTSDB_KEY`.

## 💻 Probar en local

Con el CLI de Vercel (sirve el sitio **y** las funciones, leyendo `.env.local`):

```bash
npm install -g vercel
vercel dev
```

Abre 👉 http://localhost:3000

## 🚀 Desplegar en Vercel

1. Sube el proyecto a un repo de **GitHub** (el `.env.local` no se sube).
2. En [vercel.com](https://vercel.com) → **Add New → Project → Import** el repo.
3. (Opcional) En **Settings → Environment Variables** agrega `SPORTSDB_KEY`.
4. Deploy. Vercel detecta `/api` como funciones automáticamente.

## 📂 Estructura

La lógica del front son **scripts clásicos** (scope global compartido), cargados en orden con `data.js` primero. Cada archivo tiene una sola responsabilidad:

```
Mundial2026/
├── index.html
├── css/styles.css
├── js/                    ← lógica del front, separada por responsabilidad
│   ├── data.js            ← sorteo oficial, estadios y traducciones (sin API) — se carga primero
│   ├── nav.js             ← navegación entre vistas, cuenta regresiva y ticker
│   ├── api.js             ← capa de API (TheSportsDB + FIFA) y helpers de datos
│   ├── format.js          ← fechas, horas, nombres y estado de partido
│   ├── leaders.js         ← goleadores, asistidores y tarjetas
│   ├── groups.js          ← tablas de posiciones en vivo
│   ├── teams.js           ← cuadrícula de las 48 selecciones
│   ├── stadiums.js        ← cuadrícula + modal de estadios
│   ├── calendar.js        ← partidos, resultados en vivo y refresco
│   ├── modals.js          ← apertura/cierre de modales (overlay, Escape)
│   ├── team-detail.js     ← detalle de selección (plantel, técnico)
│   ├── player-detail.js   ← detalle de jugador
│   ├── pitch.js           ← formación dibujada en la cancha
│   ├── youtube.js         ← resumen en video (YouTube)
│   ├── match-detail.js    ← detalle de partido (alineaciones, stats, dónde ver)
│   └── simulator.js       ← simulador del torneo (cuadro oficial FIFA)
├── api/
│   ├── football.js        ← función serverless (proxy a TheSportsDB)
│   ├── fifa.js            ← función serverless (proxy a la API de FIFA)
│   └── youtube.js         ← función serverless (busca resúmenes en YouTube)
├── img/
│   ├── *.png              ← escudos de las 48 selecciones
│   └── estadios/*.jpg     ← fotos de las 16 sedes
├── .env.local             ← tu clave local opcional (NO se sube)
└── .gitignore
```

## 🗺️ Estado / roadmap

- [x] Base + navegación + cuenta regresiva
- [x] Función serverless (proxy a TheSportsDB)
- [x] Grupos (tabla por grupo)
- [x] Estadios y sedes (tarjetas + modal con historia)
- [x] Calendario con horarios en hora local + resultados en vivo
- [x] Simulador del torneo (cuadro oficial, 2 modos, penales)
- [x] Fotos de los estadios (`img/estadios/<slug>.jpg`)
- [x] Detalle de equipos (jugadores con foto, técnico, club) y de jugador
- [x] Detalle de partido (alineaciones en cancha, minuto a minuto, resumen en video)
