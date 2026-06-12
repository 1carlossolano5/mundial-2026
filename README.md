# 🏆 Mundial 2026 — Guía y Simulador

Página del Mundial 2026: selecciones, estadios, calendario, resultados en vivo y un simulador del torneo. Hecha con **HTML, CSS y JavaScript puro** + una **función serverless de Vercel** que hace de proxy a [TheSportsDB](https://www.thesportsdb.com/) (cachea respuestas y evita problemas de CORS).

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
│   └── football.js   ← función serverless (proxy a TheSportsDB)
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
