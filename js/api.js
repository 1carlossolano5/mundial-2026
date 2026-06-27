/* =====================================================================
   Mundial 2026 - Capa de API (TheSportsDB + FIFA) y helpers de datos compartidos
   Parte de la logica antes en app.js. Script clasico (scope global);
   depende de data.js (cargar antes).
   ===================================================================== */
// ---- Llamadas a la API (vía nuestra función serverless) ----
// Si las funciones /api no existen (p. ej. abriendo con Live Server en vez
// de Vercel), se llama directo a la API pública para que todo funcione igual.
async function apiFetch(proxyUrl, directUrl) {
  let res = await fetch(proxyUrl).catch(() => null);
  if (!res || res.status === 404 || res.status === 405) res = await fetch(directUrl);
  if (!res.ok) {
    let msg = "Error al conectar con la API (" + res.status + ")";
    try {
      const body = await res.json();
      msg = body.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

async function api(path, params = {}) {
  const url = new URL("/api/football", window.location.origin);
  url.searchParams.set("path", path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const direct = new URL("https://www.thesportsdb.com/api/v1/json/3/" + path);
  Object.entries(params).forEach(([k, v]) => direct.searchParams.set(k, v));
  return apiFetch(url, direct);
}

// ---- API pública de FIFA (gratis: alineaciones completas, minuto a minuto) ----
const FIFA_COMP = "17"; // FIFA World Cup
const FIFA_SEASON = "285023"; // edición 2026
const loc = (arr) => (arr && arr[0] && arr[0].Description) || "";

async function fifaApi(path, params = {}) {
  const url = new URL("/api/fifa", window.location.origin);
  url.searchParams.set("path", path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const direct = new URL("https://api.fifa.com/api/v3/" + path);
  Object.entries(params).forEach(([k, v]) => direct.searchParams.set(k, v));
  direct.searchParams.set("language", "es");
  return apiFetch(url, direct);
}

// Calendario FIFA (una sola vez por sesión) para cruzar sus partidos con
// los de TheSportsDB por fecha y nombres de equipos.
let fifaCalPromise = null;
function fifaCalendar() {
  if (!fifaCalPromise) {
    fifaCalPromise = fifaApi("calendar/matches", {
      idCompetition: FIFA_COMP,
      idSeason: FIFA_SEASON,
      count: "500",
    })
      .then((d) =>
        (d.Results || []).map((m) => {
          const hs = m.Home && m.Home.Score;
          const as = m.Away && m.Away.Score;
          const homeScore = hs === "" || hs == null ? null : Number(hs);
          const awayScore = as === "" || as == null ? null : Number(as);
          return {
            id: m.IdMatch,
            stage: m.IdStage,
            ts: Date.parse(m.Date),
            home: loc(m.Home && m.Home.TeamName),
            away: loc(m.Away && m.Away.TeamName),
            homeId: m.Home && m.Home.IdTeam,
            awayId: m.Away && m.Away.IdTeam,
            group: loc(m.GroupName), // "Grupo A"… (vacío en eliminatorias)
            stageName: loc(m.StageName), // "Primera fase", "Octavos"…
            status: m.MatchStatus, // 0 fin · 3/12 en vivo · 1 programado
            minute: m.MatchTime, // "67'" en vivo
            venue: loc(m.Stadium && m.Stadium.Name),
            homeScore,
            awayScore,
            goals: (homeScore || 0) + (awayScore || 0),
          };
        })
      )
      .catch((e) => {
        fifaCalPromise = null; // permitir reintentar
        throw e;
      });
  }
  return fifaCalPromise;
}

// Cuántas palabras comparten dos nombres ("Corea del Sur" ~ "República de Corea").
const normTxt = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); // sin acentos
function nameScore(a, b) {
  const tb = new Set(normTxt(b).split(/[^a-z]+/).filter((w) => w.length >= 3));
  return normTxt(a).split(/[^a-z]+/).filter((w) => w.length >= 3 && tb.has(w)).length;
}

// Partido FIFA equivalente a un evento de TheSportsDB (misma hora + nombres).
async function findFifaMatch(ev) {
  const d = matchDate(ev);
  if (!d) return null;
  const cal = await fifaCalendar();
  const cerca = cal.filter((m) => Math.abs(m.ts - d.getTime()) < 3 * 3600000);
  if (cerca.length === 1) return cerca[0];
  const h = teamName(ev.strHomeTeam);
  const a = teamName(ev.strAwayTeam);
  let best = null;
  let bestScore = 0;
  for (const m of cerca) {
    const s = nameScore(h, m.home) + nameScore(a, m.away);
    if (s > bestScore) {
      best = m;
      bestScore = s;
    }
  }
  return best;
}

// IdTeam de FIFA para una selección (por nombre), buscando en el calendario.
async function fifaTeamId(esName) {
  const cal = await fifaCalendar();
  // 1) Match exacto vía GROUPS (incluye alias, p. ej. "EE. UU." → Estados Unidos).
  for (const m of cal) {
    const gh = groupTeamForFifa(m.home);
    if (m.homeId && gh && gh.name === esName) return m.homeId;
    const ga = groupTeamForFifa(m.away);
    if (m.awayId && ga && ga.name === esName) return m.awayId;
  }
  // 2) Respaldo: por palabras compartidas.
  let bestId = null;
  let bestScore = 0;
  for (const m of cal) {
    const sh = nameScore(esName, m.home);
    if (m.homeId && sh > bestScore) {
      bestScore = sh;
      bestId = m.homeId;
    }
    const sa = nameScore(esName, m.away);
    if (m.awayId && sa > bestScore) {
      bestScore = sa;
      bestId = m.awayId;
    }
  }
  return bestId;
}

// Nombres FIFA que no comparten palabras con los de GROUPS (no se emparejan
// por tokens). Clave normalizada (sin acentos/minúsculas) → nombre en GROUPS.
const FIFA_TEAM_ALIAS = { "ee uu": "Estados Unidos" };

// Equipo de GROUPS equivalente a un nombre FIFA (por alias o por palabras).
function groupTeamForFifa(fifaName) {
  const all = GROUPS.flatMap((g) => g.teams);
  const clave = normTxt(fifaName).replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const alias = FIFA_TEAM_ALIAS[clave];
  if (alias) return all.find((t) => t.name === alias) || null;
  return all.find((t) => nameScore(fifaName, t.name) >= 1) || null;
}

// IdTeam de FIFA → bandera/escudo/nombre (cruzando el calendario con los datos
// estáticos de GROUPS) para mostrar de qué selección es cada goleador.
let fifaTeamMetaPromise = null;
function fifaTeamMeta() {
  if (!fifaTeamMetaPromise) {
    fifaTeamMetaPromise = fifaCalendar().then((cal) => {
      const map = {};
      for (const m of cal) {
        for (const [id, fifaName] of [[m.homeId, m.home], [m.awayId, m.away]]) {
          if (!id || map[id]) continue;
          const gt = groupTeamForFifa(fifaName);
          map[id] = gt
            ? { name: gt.name, flag: gt.flag, crest: gt.img }
            : { name: fifaName, flag: "", crest: "" };
        }
      }
      return map;
    });
  }
  return fifaTeamMetaPromise;
}

// Plantilla de un equipo por IdTeam (cacheada). La usan el modal de selección,
// la tabla de líderes (fotos) y el modal de jugador.
const squadByIdCache = {};
function fifaSquadById(idTeam) {
  if (!squadByIdCache[idTeam]) {
    squadByIdCache[idTeam] = fifaApi(`teams/${idTeam}/squad`, {
      idCompetition: FIFA_COMP,
      idSeason: FIFA_SEASON,
    })
      .then((sq) => (sq && (sq.Players || []).length ? sq : null))
      .catch(() => null);
  }
  return squadByIdCache[idTeam];
}

// Ejecuta fn sobre items con un límite de concurrencia (no saturar la API).
async function poolMap(items, limit, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Nombre del jugador desde la descripción de un evento. Funciona para goles
// y asistencias ("...de X (País)"), tarjetas amarillas ("amonesta a X (País)")
// y rojas ("expulsión de X (País)"): toma lo que sigue al último " de " o " a ".
function playerFromDesc(desc) {
  if (!desc) return null;
  let s = desc.replace(/\s*\([^()]*\)\s*[!.]*$/, "").trim(); // quita "(País)!" final
  const ide = s.toLowerCase().lastIndexOf(" de ");
  const ia = s.toLowerCase().lastIndexOf(" a ");
  if (ide >= 0 && ide >= ia) s = s.slice(ide + 4);
  else if (ia >= 0) s = s.slice(ia + 3);
  s = s.replace(/^[¡!.\s]+|[!.\s]+$/g, "").trim(); // limpia signos sobrantes
  return s || null;
}
