# 🏆 Mundial 2026 — Guía y Simulador

Página del Mundial 2026: selecciones, estadios, calendario, resultados en vivo y un simulador del torneo. Hecha con **HTML, CSS y JavaScript puro** + dos **funciones serverless de Vercel** que hacen de proxy (cachean respuestas y evitan problemas de CORS) hacia:

- [TheSportsDB](https://www.thesportsdb.com/) — calendario, resultados, escudos y estadísticas.
- **API pública de FIFA** (api.fifa.com, gratis y sin clave) — alineaciones completas (26 jugadores con foto), táctica, técnico, árbitro y minuto a minuto en español.

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

```
Mundial2026/
├── index.html
├── css/styles.css
├── js/
│   ├── app.js        ← navegación, grupos, estadios, calendario
│   ├── data.js       ← sorteo oficial, estadios y traducciones (sin API)
│   └── simulator.js  ← simulador del torneo (cuadro oficial FIFA)
├── api/
│   ├── football.js   ← función serverless (proxy a TheSportsDB)
│   └── fifa.js       ← función serverless (proxy a la API de FIFA)
├── img/              ← escudos de las 48 selecciones
├── .env.local        ← tu clave local opcional (NO se sube)
└── .gitignore
```

## 🗺️ Estado / roadmap

- [x] Base + navegación + cuenta regresiva
- [x] Función serverless (proxy a TheSportsDB)
- [x] Grupos (tabla por grupo)
- [x] Estadios y sedes (tarjetas + modal con historia)
- [x] Calendario con horarios en hora local + resultados en vivo
- [x] Simulador del torneo (cuadro oficial, 2 modos, penales)
- [ ] Fotos de los estadios (`img/estadios/<slug>.jpg`)
- [ ] Detalle de equipos (jugadores con foto, técnico, club)
