# 🏆 Mundial 2026 — Guía y Simulador

Página del Mundial 2026: selecciones, jugadores, estadios, calendario, resultados en vivo y un simulador del torneo. Hecha con **HTML, CSS y JavaScript puro** + una **función serverless de Vercel** que oculta la API key de [API-Football](https://www.api-football.com/).

Proyecto de portafolio de **Carlos Solano**.

## 🔑 Configurar la API key

1. Crea cuenta gratis en [API-Football](https://www.api-football.com/) → copia tu **API key**.
2. **Local:** copia `.env.example` a `.env.local` y pega tu clave:
   ```
   APIFOOTBALL_KEY=tu_clave
   ```
3. **En Vercel:** Settings → Environment Variables → agrega `APIFOOTBALL_KEY`.

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
3. En **Settings → Environment Variables** agrega `APIFOOTBALL_KEY`.
4. Deploy. Vercel detecta `/api` como funciones automáticamente.

## 📂 Estructura

```
Mundial2026/
├── index.html
├── css/styles.css
├── js/app.js
├── api/
│   └── football.js   ← función serverless (oculta la API key)
├── .env.local        ← tu clave local (NO se sube)
└── .gitignore
```

## 🗺️ Estado / roadmap

- [x] Base + navegación + cuenta regresiva
- [x] Función serverless (proxy a API-Football)
- [x] Grupos (tabla por grupo)
- [ ] Detalle de equipos (jugadores con foto, técnico, club)
- [ ] Estadios y sedes
- [ ] Calendario con horarios + resultados en vivo
- [ ] Simulador del torneo (bracket)
