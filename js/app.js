/* =====================================================================
   Mundial 2026 — Lógica base
   ===================================================================== */

// Liga 4429 = FIFA World Cup en TheSportsDB.
const WC_LEAGUE = 4429;
const SEASON = "2026";
const KICKOFF = new Date("2026-06-11T18:00:00-05:00"); // inauguración (aprox.)

// ---- Navegación entre vistas ----
const $navBtns = document.querySelectorAll("[data-section]");
const $views = document.querySelectorAll(".view");

function showSection(name) {
  $views.forEach((v) => v.classList.toggle("is-active", v.id === name));
  document.querySelectorAll(".nav__btn").forEach((b) =>
    b.classList.toggle("is-active", b.dataset.section === name)
  );
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Carga perezosa de cada sección la primera vez.
  if (name === "grupos" && !gruposCargados) loadGroups();
  if (name === "equipos" && !equiposCargado) loadEquipos();
  if (name === "estadios" && !estadiosCargados) loadStadiums();
  if (name === "calendario" && !calendarioCargado) loadCalendar();

  if (name === "goleadores" && !goleadoresCargado) loadScorers();

  // Resultados en vivo: refrescar el calendario solo mientras se está viendo.
  if (name === "calendario") startCalRefresh();
  else stopCalRefresh();
}

$navBtns.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    showSection(btn.dataset.section);
  });
});

// ---- Cuenta regresiva ----
const $countdown = document.getElementById("countdown");
function renderCountdown() {
  const diff = KICKOFF - new Date();
  if (diff <= 0) {
    $countdown.innerHTML = `<div class="cd-box"><b>¡EN JUEGO!</b><span>El Mundial ya comenzó</span></div>`;
    return;
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const box = (n, l) => `<div class="cd-box"><b>${n}</b><span>${l}</span></div>`;
  $countdown.innerHTML = box(d, "Días") + box(h, "Horas") + box(m, "Min") + box(s, "Seg");
}
renderCountdown();
setInterval(renderCountdown, 1000);

// ---- Ticker de banderas (estilo transmisión deportiva) ----
(function buildTicker() {
  const track = document.getElementById("tickerTrack");
  if (!track) return;
  const all = GROUPS.flatMap((g) => g.teams);
  const item = (t) => `<span class="ticker__item"><img src="${t.img}" alt="" loading="lazy" />${t.name}</span>`;
  // Duplicamos la lista para que el desplazamiento sea continuo (loop).
  track.innerHTML = all.map(item).join("") + all.map(item).join("");
})();

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

// ---- Líderes: goleadores, asistidores y tarjetas ----
// (Calculados del minuto a minuto; FIFA no expone un endpoint útil de rankings.)
let goleadoresCargado = false;
let golTally = null; // tally cacheado para cambiar de pestaña sin recalcular
let golTab = "goles";
const golPlayerDir = {}; // IdPlayer → jugador del squad (para fotos en la tabla)
const $golList = document.getElementById("golList");
const $golStatus = document.getElementById("golStatus");
const $golTabs = document.getElementById("golTabs");
const $golFeature = document.getElementById("golFeature");
const golTimelineCache = {};

// Configuración de cada pestaña: columnas, valores, criterio de orden y ranking.
const GOL_TABS = [
  {
    id: "goles", label: "⚽ Goleadores", cols: ["G", "A"],
    val: (t) => [t.goles, t.asist], rankBy: (t) => t.goles,
    sort: (a, b) => b.goles - a.goles || b.asist - a.asist,
    vacio: "Todavía no hay goles registrados.",
  },
  {
    id: "asist", label: "🅰️ Asistidores", cols: ["A", "G"],
    val: (t) => [t.asist, t.goles], rankBy: (t) => t.asist,
    sort: (a, b) => b.asist - a.asist || b.goles - a.goles,
    vacio: "Todavía no hay asistencias registradas.",
  },
  {
    id: "tarjetas", label: "🟨 Tarjetas", cols: ["🟨", "🟥"],
    val: (t) => [t.amarillas, t.rojas], rankBy: (t) => t.amarillas + t.rojas * 2,
    sort: (a, b) => b.amarillas + b.rojas * 2 - (a.amarillas + a.rojas * 2) || b.rojas - a.rojas,
    vacio: "Todavía no hay tarjetas registradas.",
  },
];

function timelineForMatch(m) {
  if (!golTimelineCache[m.id]) {
    golTimelineCache[m.id] = fifaApi(`timelines/${FIFA_COMP}/${FIFA_SEASON}/${m.stage}/${m.id}`)
      .then((d) => d.Event || [])
      .catch(() => []);
  }
  return golTimelineCache[m.id];
}

// Tipo de evento FIFA → en qué contador suma (0 gol, 1 asist, 2 amarilla, 3 roja).
const GOL_EV = { 0: "goles", 1: "asist", 2: "amarillas", 3: "rojas" };

function renderGolTabs() {
  $golTabs.innerHTML = GOL_TABS.map(
    (t) => `<button class="gol-tab ${t.id === golTab ? "is-active" : ""}" data-tab="${t.id}" role="tab" aria-selected="${t.id === golTab}">${t.label}</button>`
  ).join("");
}

function renderGolTable(meta) {
  const cfg = GOL_TABS.find((t) => t.id === golTab);
  const rows = Object.values(golTally)
    .filter((t) => cfg.rankBy(t) > 0)
    .sort((a, b) => cfg.sort(a, b) || (a.name || "").localeCompare(b.name || ""))
    .slice(0, 25);

  if (!rows.length) {
    $golFeature.hidden = true;
    $golList.innerHTML = `<p class="placeholder">${cfg.vacio} La tabla se llenará a medida que se jueguen los partidos.</p>`;
    return;
  }
  renderGolFeature(rows[0], cfg, meta);
  let pos = 0;
  let prev = null;
  $golList.dataset.tab = golTab;
  $golList.innerHTML =
    `<div class="scorer-row scorer-row--head"><span>#</span><span></span><span>Jugador</span><span>${cfg.cols[0]}</span><span>${cfg.cols[1]}</span></div>` +
    rows
      .map((t, i) => {
        const r = cfg.rankBy(t);
        if (r !== prev) {
          pos = i + 1;
          prev = r;
        }
        const tm = meta[t.idTeam] || {};
        const [v1, v2] = cfg.val(t);
        const foto = golPlayerDir[t.idPlayer] && golPlayerDir[t.idPlayer].PlayerPicture
          ? golPlayerDir[t.idPlayer].PlayerPicture.PictureUrl
          : "";
        const ini = (t.name || "?")[0];
        const fotoHTML = foto
          ? `<img class="scorer-photo" src="${foto}" alt="" loading="lazy" onerror="this.outerHTML='<span class=\\'scorer-photo scorer-photo--ph\\'>${ini}</span>'" />`
          : `<span class="scorer-photo scorer-photo--ph">${ini}</span>`;
        const clic = t.idPlayer
          ? `<button class="scorer-row is-clickable" data-player="${t.idPlayer}" data-team="${t.idTeam || ""}" aria-label="Ver ficha de ${t.name || ""}">`
          : `<div class="scorer-row">`;
        const cierre = t.idPlayer ? `</button>` : `</div>`;
        return `${clic}
          <span class="scorer-pos">${pos}</span>
          ${fotoHTML}
          <span class="scorer-name">${t.name || "—"}<small>${tm.name || ""}</small></span>
          <span class="scorer-g">${v1}</span>
          <span class="scorer-a">${v2}</span>
        ${cierre}`;
      })
      .join("");
}

// Tarjeta destacada del líder (llena el espacio en pantallas anchas).
function renderGolFeature(top, cfg, meta) {
  const tm = meta[top.idTeam] || {};
  const foto = golPlayerDir[top.idPlayer] && golPlayerDir[top.idPlayer].PlayerPicture
    ? golPlayerDir[top.idPlayer].PlayerPicture.PictureUrl
    : "";
  const ini = (top.name || "?")[0];
  const [v1] = cfg.val(top);
  $golFeature.hidden = false;
  $golFeature.innerHTML = `
    <div class="feat-label">Líder · ${cfg.label.replace(/^\S+\s/, "")}</div>
    ${top.idPlayer ? `<button class="feat-card is-clickable" data-player="${top.idPlayer}" data-team="${top.idTeam || ""}" aria-label="Ver ficha de ${top.name || ""}">` : `<div class="feat-card">`}
      ${foto
        ? `<img class="feat-photo" src="${foto}" alt="" onerror="this.outerHTML='<span class=\\'feat-photo feat-photo--ph\\'>${ini}</span>'" />`
        : `<span class="feat-photo feat-photo--ph">${ini}</span>`}
      <span class="feat-stat">${v1}</span>
      <span class="feat-statlbl">${cfg.cols[0] === "G" ? "goles" : cfg.cols[0] === "A" ? "asistencias" : "tarjetas"}</span>
      <h3 class="feat-name">${top.name || "—"}</h3>
      <p class="feat-team">${tm.name || ""}</p>
    ${top.idPlayer ? `</button>` : `</div>`}`;
}

// Clic en una fila de la tabla o en la tarjeta destacada -> modal de jugador.
function golClickToPlayer(e) {
  const el = e.target.closest("[data-player]");
  if (el) openPlayer(el.dataset.player, el.dataset.team);
}
$golList.addEventListener("click", golClickToPlayer);
$golFeature.addEventListener("click", golClickToPlayer);

let golMeta = {};
async function loadScorers() {
  goleadoresCargado = true;
  renderGolTabs();
  $golStatus.hidden = false;
  $golList.innerHTML = "";
  try {
    const [cal, meta] = await Promise.all([fifaCalendar(), fifaTeamMeta()]);
    golMeta = meta;
    // Goles, tarjetas y faltas pueden darse en cualquier partido jugado.
    const jugados = cal.filter((m) => m.ts <= Date.now());
    const listas = await poolMap(jugados, 6, timelineForMatch);

    const tally = {}; // IdPlayer → { goles, asist, amarillas, rojas, name, idTeam, idPlayer }
    listas.forEach((events) => {
      (events || []).forEach((e) => {
        const campo = GOL_EV[e.Type];
        if (!campo) return;
        const key = e.IdPlayer || "d:" + loc(e.EventDescription);
        const t =
          tally[key] ||
          (tally[key] = { goles: 0, asist: 0, amarillas: 0, rojas: 0, name: playerFromDesc(loc(e.EventDescription)), idTeam: e.IdTeam, idPlayer: e.IdPlayer || null });
        t[campo]++;
        if (!t.name) t.name = playerFromDesc(loc(e.EventDescription));
      });
    });
    golTally = tally;

    $golStatus.hidden = true;
    renderGolTable(meta); // primero render rápido (sin fotos)

    // Luego trae las plantillas de los equipos involucrados para las fotos y
    // re-renderiza. Cacheadas y compartidas con el modal de selección/jugador.
    const teamsInvolved = [...new Set(Object.values(tally).map((t) => t.idTeam).filter(Boolean))];
    const squads = await poolMap(teamsInvolved, 6, fifaSquadById);
    squads.forEach((sq) => {
      if (sq) (sq.Players || []).forEach((p) => (golPlayerDir[p.IdPlayer] = p));
    });
    renderGolTable(meta); // re-render con fotos
  } catch (err) {
    $golStatus.hidden = true;
    goleadoresCargado = false; // permitir reintentar al volver a entrar
    $golList.innerHTML = `<p class="placeholder">${err.message}</p>`;
  }
}

// Cambio de pestaña: re-render instantáneo desde el tally ya calculado.
$golTabs.addEventListener("click", (e) => {
  const btn = e.target.closest(".gol-tab");
  if (!btn || btn.dataset.tab === golTab) return;
  golTab = btn.dataset.tab;
  renderGolTabs();
  if (golTally) renderGolTable(golMeta);
});

// ---- Grupos (tablas de posiciones en vivo, calculadas del calendario) ----
let gruposCargados = false;
const $gruposGrid = document.getElementById("gruposGrid");
const $gruposStatus = document.getElementById("gruposStatus");

// Tabla de cada grupo a partir de los resultados del calendario FIFA.
function computeGroupStandings(cal) {
  const grupos = {}; // "Grupo A" → { idTeam → fila }
  for (const m of cal) {
    if (!m.group || !/grupo/i.test(m.group)) continue; // solo fase de grupos
    const g = grupos[m.group] || (grupos[m.group] = {});
    // Asegura que las 4 selecciones aparezcan aunque no hayan jugado.
    if (m.homeId && !g[m.homeId]) g[m.homeId] = { id: m.homeId, name: m.home, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 };
    if (m.awayId && !g[m.awayId]) g[m.awayId] = { id: m.awayId, name: m.away, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 };
    const hs = m.homeScore, as = m.awayScore;
    if (hs == null || as == null) continue; // partido aún sin jugar
    const H = g[m.homeId], A = g[m.awayId];
    if (!H || !A) continue;
    H.pj++; A.pj++;
    H.gf += hs; H.gc += as; A.gf += as; A.gc += hs;
    if (hs > as) { H.g++; H.pts += 3; A.p++; }
    else if (hs < as) { A.g++; A.pts += 3; H.p++; }
    else { H.e++; A.e++; H.pts++; A.pts++; }
  }
  const out = {};
  Object.keys(grupos).sort().forEach((gn) => {
    const filas = Object.values(grupos[gn]).map((r) => ({ ...r, dg: r.gf - r.gc }));
    filas.sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.name.localeCompare(b.name));
    out[gn] = filas;
  });
  return out;
}

async function loadGroups() {
  gruposCargados = true;
  $gruposStatus.hidden = false;
  $gruposGrid.innerHTML = "";
  try {
    const [cal, meta] = await Promise.all([fifaCalendar(), fifaTeamMeta()]);
    const standings = computeGroupStandings(cal);
    const nombres = Object.keys(standings);
    $gruposStatus.hidden = true;
    if (!nombres.length) {
      $gruposGrid.innerHTML = `<p class="placeholder">Las posiciones aparecerán cuando la API publique los grupos y resultados.</p>`;
      return;
    }
    $gruposGrid.innerHTML = nombres
      .map((gn) => {
        const filas = standings[gn];
        return `<div class="group-card">
          <div class="group-card__head"><span>${gn}</span></div>
          <div class="stand-wrap">
            <table class="stand stand--full">
              <tr><th></th><th class="stand__th-team">Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr>
              ${filas
                .map((r, i) => {
                  const tm = meta[r.id] || {};
                  const nombre = tm.name || r.name;
                  const crest = tm.crest || "";
                  const cls = i < 2 ? "q1" : i === 2 ? "q3" : "q4";
                  return `<tr class="${cls}" data-team="${nombre}" tabindex="0" role="button" aria-label="Ver ${nombre}">
                    <td>${i + 1}</td>
                    <td class="stand__team"><img src="${crest}" alt="" loading="lazy"><span>${nombre}</span></td>
                    <td>${r.pj}</td><td>${r.g}</td><td>${r.e}</td><td>${r.p}</td>
                    <td>${r.gf}</td><td>${r.gc}</td><td>${r.dg > 0 ? "+" + r.dg : r.dg}</td><td><b>${r.pts}</b></td>
                  </tr>`;
                })
                .join("")}
            </table>
          </div>
        </div>`;
      })
      .join("");
  } catch (err) {
    $gruposStatus.hidden = true;
    gruposCargados = false; // permitir reintentar
    $gruposGrid.innerHTML = `<p class="placeholder">${err.message}</p>`;
  }
}

// Clic (o Enter) en una fila -> modal de la selección.
$gruposGrid.addEventListener("click", (e) => {
  const row = e.target.closest("[data-team]");
  if (row) openTeam(row.dataset.team);
});
$gruposGrid.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const row = e.target.closest("[data-team]");
  if (!row) return;
  e.preventDefault();
  openTeam(row.dataset.team);
});

// ---- Equipos (las 48 selecciones, en cuadrícula) ----
let equiposCargado = false;
const $equiposGrid = document.getElementById("equiposGrid");

function loadEquipos() {
  equiposCargado = true;
  const todos = GROUPS.flatMap((g) => g.teams).slice().sort((a, b) => a.name.localeCompare(b.name));
  $equiposGrid.innerHTML = todos
    .map(
      (t) => `<button class="team-card" data-team="${t.name}" aria-label="Ver ${t.name}">
        <img class="team-card__crest" src="${t.img}" alt="" loading="lazy" />
        <span class="team-card__name">${t.name}</span>
      </button>`
    )
    .join("");
}

$equiposGrid.addEventListener("click", (e) => {
  const card = e.target.closest(".team-card[data-team]");
  if (card) openTeam(card.dataset.team);
});

// =====================================================================
// ESTADIOS
// =====================================================================
let estadiosCargados = false;
const $estadiosGrid = document.getElementById("estadiosGrid");
const $stadiumModal = document.getElementById("stadiumModal");
const $stadiumContent = document.getElementById("stadiumContent");

// Imagen de fondo con degradado de respaldo (si la foto aún no existe).
function photoBg(img) {
  return `background-image: url('${img}'), linear-gradient(135deg, #1b355c, #101d36)`;
}

function loadStadiums() {
  estadiosCargados = true;
  $estadiosGrid.innerHTML = STADIUMS.map(
    (s, i) => `
    <article class="stadium-card" data-idx="${i}" tabindex="0" role="button" aria-label="Ver ${s.name}">
      <div class="stadium-card__photo" style="${photoBg(s.img)}">
        <span class="stadium-card__flag">${s.flag}</span>
      </div>
      <div class="stadium-card__body">
        <h3 class="stadium-card__name">${s.name}</h3>
        <p class="stadium-card__city">${s.city} · ${s.country}</p>
        <p class="stadium-card__cap">≈ ${s.cap} asientos</p>
        <span class="stadium-card__more">Ver historia →</span>
      </div>
    </article>`
  ).join("");
}

function openStadium(i) {
  const s = STADIUMS[i];
  if (!s) return;
  $stadiumContent.innerHTML = `
    <div class="st-modal__photo" style="${photoBg(s.img)}"></div>
    <div class="st-modal__body">
      <span class="st-modal__loc">${s.flag} ${s.city} · ${s.country}</span>
      <h2 class="st-modal__name">${s.name}</h2>
      <p class="st-modal__cap">Capacidad ≈ ${s.cap} espectadores</p>
      <p class="st-modal__desc">${s.desc}</p>
      <div class="st-modal__wc">
        <h3>🏆 En la Copa del Mundo</h3>
        <p>${s.wc}</p>
      </div>
    </div>`;
  $stadiumModal.hidden = false;
  document.body.style.overflow = "hidden";
}
function closeStadium() {
  $stadiumModal.hidden = true;
  document.body.style.overflow = "";
}

// Abrir estadio (clic o teclado) y cerrar el modal
$estadiosGrid.addEventListener("click", (e) => {
  const card = e.target.closest(".stadium-card");
  if (card) openStadium(Number(card.dataset.idx));
});
$estadiosGrid.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const card = e.target.closest(".stadium-card");
  if (!card) return;
  e.preventDefault();
  openStadium(Number(card.dataset.idx));
});
$stadiumModal.addEventListener("click", (e) => {
  if (e.target.hasAttribute("data-close")) closeStadium();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$stadiumModal.hidden) closeStadium();
});

// =====================================================================
// CALENDARIO (partidos + resultados en vivo, desde TheSportsDB)
// =====================================================================
let calendarioCargado = false;
const $calList = document.getElementById("calList");
const $calStatus = document.getElementById("calStatus");
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function fmtFecha(s) {
  const [y, m, d] = (s || "").split("-").map(Number);
  return m ? `${d} de ${MESES[m - 1]}` : s;
}

// TheSportsDB entrega las horas en UTC. Las convertimos a la hora LOCAL
// del visitante (en Colombia se ve hora de Colombia, etc.) usando su navegador.
function matchDate(e) {
  const ts = e.strTimestamp
    ? e.strTimestamp + "Z"
    : (e.dateEvent || "") + "T" + (e.strTime || "00:00:00") + "Z";
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}
// Nombres de equipos en español si el navegador está en español; si no, se dejan
// como los entrega la API (depende del idioma de quien abre el link).
// Las fechas y horas siguen el mismo criterio para no mezclar idiomas.
const APP_ES = (navigator.language || "es").toLowerCase().startsWith("es");
const APP_LOCALE = APP_ES ? "es" : navigator.language || "en";
function fmtHoraLocal(d) {
  return d.toLocaleTimeString(APP_LOCALE, { hour: "numeric", minute: "2-digit", hour12: true });
}
function teamName(x) {
  if (!x) return "";
  return APP_ES && typeof TEAM_ES !== "undefined" ? TEAM_ES[x] || x : x;
}
function fmtFechaLocal(d) {
  return d.toLocaleDateString(APP_LOCALE, { weekday: "long", day: "numeric", month: "long" });
}

// Estado de un partido FIFA: 0 = terminado · 3/12 = en vivo · resto = programado.
function fifaState(status) {
  if (status === 0) return "fin";
  if (status === 3 || status === 12) return "live";
  return "prog";
}

// Tarjeta de partido (datos FIFA). Escudo y nombre desde GROUPS (escudo local).
function fifaMatchCard(m) {
  const estado = fifaState(m.status);
  const th = groupTeamForFifa(m.home), ta = groupTeamForFifa(m.away);
  const nh = th ? th.name : m.home || "Por definir", na = ta ? ta.name : m.away || "Por definir";
  const ch = th ? th.img : "", ca = ta ? ta.img : "";
  const d = new Date(m.ts);
  const hora = isNaN(d.getTime()) ? "vs" : fmtHoraLocal(d);
  const centro =
    estado === "prog"
      ? `<span class="mc__time">${hora}</span>`
      : `<span class="mc__score">${m.homeScore ?? "·"} - ${m.awayScore ?? "·"}</span>`;
  const bajo =
    estado === "fin"
      ? `<span class="mc__ft">Final</span>`
      : estado === "live"
        ? `<span class="mc__live">● En vivo${m.minute ? " " + m.minute : ""}</span>`
        : "";
  const sub = [m.venue ? `📍 ${m.venue}` : "", m.group || m.stageName].filter(Boolean).join(" · ");
  return `
    <button class="match-card ${estado === "fin" ? "is-played" : ""} ${estado === "live" ? "is-live" : ""}" data-id="${m.id}" data-stage="${m.stage}" aria-label="Ver ${nh} vs ${na}">
      <div class="mc__team mc__home"><span>${nh}</span><img src="${ch}" alt="" loading="lazy" /></div>
      <div class="mc__center">${centro}${bajo}</div>
      <div class="mc__team mc__away"><img src="${ca}" alt="" loading="lazy" /><span>${na}</span></div>
      ${sub ? `<div class="mc__venue">${sub}</div>` : ""}
    </button>`;
}

// Orden: en vivo primero, luego por fecha/hora.
function renderCalendar(cal) {
  if (!cal.length) {
    $calList.innerHTML = `<p class="placeholder">Aún no hay partidos publicados por la API.</p>`;
    return;
  }
  const sorted = cal.slice().sort((a, b) => (a.ts || 0) - (b.ts || 0));
  const live = sorted.filter((m) => fifaState(m.status) === "live");
  let html = "";
  if (live.length) {
    html += `<h3 class="cal-date cal-date--live">● En vivo ahora</h3>` + live.map(fifaMatchCard).join("");
  }
  let clave = "";
  for (const m of sorted) {
    if (fifaState(m.status) === "live") continue; // ya van arriba
    const d = new Date(m.ts);
    const k = isNaN(d.getTime()) ? "?" : d.toLocaleDateString("en-CA");
    if (k !== clave) {
      clave = k;
      html += `<h3 class="cal-date">${isNaN(d.getTime()) ? "Por definir" : fmtFechaLocal(d)}</h3>`;
    }
    html += fifaMatchCard(m);
  }
  $calList.innerHTML = html;
}

async function loadCalendar() {
  calendarioCargado = true;
  $calStatus.hidden = false;
  $calList.innerHTML = "";
  try {
    const cal = await fifaCalendar();
    $calStatus.hidden = true;
    renderCalendar(cal);
  } catch (err) {
    $calStatus.hidden = true;
    calendarioCargado = false; // permitir reintentar al volver a entrar
    $calList.innerHTML = `<p class="placeholder">${err.message}</p>`;
  }
}

// ---- Refresco automático (resultados en vivo) ----
// Cada 60s, mientras la vista Calendario está activa, re-trae el calendario
// (forzando el re-fetch para ver marcadores y estados nuevos).
const CAL_REFRESH_MS = 60000;
let calTimer = null;
function startCalRefresh() {
  if (calTimer) return;
  calTimer = setInterval(async () => {
    if (document.hidden || !calendarioCargado) return;
    try {
      fifaCalPromise = null; // forzar datos frescos
      renderCalendar(await fifaCalendar());
    } catch {} // si falla un refresco, se conserva lo que ya está en pantalla
  }, CAL_REFRESH_MS);
}
function stopCalRefresh() {
  clearInterval(calTimer);
  calTimer = null;
}

// Clic en un partido -> modal con alineaciones, goles y estadísticas.
$calList.addEventListener("click", (e) => {
  const card = e.target.closest(".match-card[data-id]");
  if (card) openMatch(card.dataset.stage, card.dataset.id);
});

// =====================================================================
// MODALES GENÉRICOS (selección y partido)
// =====================================================================
const $teamModal = document.getElementById("teamModal");
const $teamContent = document.getElementById("teamContent");
const $matchModal = document.getElementById("matchModal");
const $matchContent = document.getElementById("matchContent");
const $playerModal = document.getElementById("playerModal");
const $playerContent = document.getElementById("playerContent");

function anyModalOpen() {
  return [...document.querySelectorAll(".modal")].some((m) => !m.hidden);
}
function openModal($m) {
  $m.hidden = false;
  document.body.style.overflow = "hidden";
}
function closeModal($m) {
  $m.hidden = true;
  if (!anyModalOpen()) document.body.style.overflow = ""; // mantener bloqueo si hay otro modal debajo
}
[$teamModal, $matchModal, $playerModal].forEach(($m) => {
  $m.addEventListener("click", (e) => {
    if (e.target.hasAttribute("data-close")) closeModal($m);
  });
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  // Cierra primero el modal de más arriba (jugador), luego los de abajo.
  if (!$playerModal.hidden) closeModal($playerModal);
  else if (!$teamModal.hidden) closeModal($teamModal);
  else if (!$matchModal.hidden) closeModal($matchModal);
});

const spinnerHTML = (msg) => `<div class="status"><div class="spinner"></div><p>${msg}</p></div>`;
const modalError = (msg) => `<div class="modal-pad"><p class="placeholder">${msg}</p></div>`;

// =====================================================================
// DETALLE DE SELECCIÓN (jugadores, técnico, últimos partidos)
// =====================================================================
// Nombre en inglés (como lo conoce TheSportsDB) a partir de la traducción.
const TEAM_EN = {};
Object.entries(TEAM_ES).forEach(([en, es]) => {
  if (!TEAM_EN[es]) TEAM_EN[es] = en;
});

// La API trae posiciones granulares ("Centre-Back", "Left Wing", "Attacking
// Midfield"...). Se agrupan en líneas por palabras clave.
function posGroup(pos = "") {
  const p = pos.toLowerCase();
  if (p.includes("manager") || p.includes("coach")) return "dt";
  if (p.includes("goalkeeper") || p === "gk") return "por";
  if (p.includes("midfield")) return "med";
  if (p.includes("back") || p.includes("defen")) return "def";
  if (p.includes("wing") || p.includes("forward") || p.includes("striker") || p.includes("attack")) return "del";
  return "otros";
}
const POS_ES = [
  ["por", "Porteros"],
  ["def", "Defensas"],
  ["med", "Mediocampistas"],
  ["del", "Delanteros"],
  ["otros", "Otros"],
];

const teamCache = {};

// Plantel completo (lista de 26 convocados) desde la API de FIFA. El endpoint
// /teams/{id}/squad existe para TODAS las selecciones, hayan jugado o no:
// número, posición y técnico siempre; las fotos aparecen cuando el equipo
// debuta. Devuelve null si no se halla el equipo.
async function fifaSquad(esName) {
  const id = await fifaTeamId(esName);
  if (!id) return null;
  return fifaSquadById(id);
}

async function fetchTeamTSDB(esName) {
  const en = TEAM_EN[esName] || esName;
  const found = await api("searchteams.php", { t: en });
  const soccer = (found.teams || []).filter((t) => t.strSport === "Soccer");
  const team =
    soccer.find((t) => (t.strTeam || "").toLowerCase() === en.toLowerCase()) || soccer[0];
  if (!team) throw new Error("No se encontró esta selección en TheSportsDB.");
  const [pl, last] = await Promise.all([
    api("lookup_all_players.php", { id: team.idTeam }).catch(() => ({})),
    api("eventslast.php", { id: team.idTeam }).catch(() => ({})),
  ]);
  return { team, players: pl.player || [], last: last.results || [] };
}

async function fetchTeam(esName) {
  const [tsdb, squad] = await Promise.all([
    fetchTeamTSDB(esName).catch(() => null),
    fifaSquad(esName).catch(() => null),
  ]);
  if (!tsdb && !squad) throw new Error("No se encontraron datos de esta selección.");
  return { tsdb, squad };
}

function playerCard(p) {
  const foto = p.strCutout || p.strThumb || "";
  const num = p.strNumber && p.strNumber !== "0" ? p.strNumber : "";
  // Si tiene IdPlayer (datos FIFA) la tarjeta es un botón que abre el modal jugador.
  const clic = p.idPlayer
    ? `<button class="player-card is-clickable" data-player="${p.idPlayer}" data-team="${p.idTeam || ""}" aria-label="Ver ficha de ${p.strPlayer || ""}">`
    : `<div class="player-card">`;
  const cierre = p.idPlayer ? `</button>` : `</div>`;
  return `
    ${clic}
      ${foto
        ? `<img class="player-card__photo" src="${foto}" alt="" loading="lazy" onerror="this.outerHTML='<span class=\\'player-card__ph\\'>${(p.strPlayer || "?")[0]}</span>'" />`
        : `<span class="player-card__ph">${(p.strPlayer || "?")[0]}</span>`}
      <span class="player-card__name">${p.strPlayer || ""}</span>
      <span class="player-card__meta">${num ? `#${num}` : ""}${p.strTeam2 && p.strTeam2 !== p.strTeam ? ` · ${p.strTeam2}` : ""}</span>
    ${cierre}`;
}

function lastMatchRow(r, idTeam) {
  const local = r.idHomeTeam === idTeam;
  const gf = local ? r.intHomeScore : r.intAwayScore;
  const gc = local ? r.intAwayScore : r.intHomeScore;
  const res = gf == null ? "" : gf > gc ? "G" : gf < gc ? "P" : "E";
  return `
    <div class="last-row">
      <span class="last-row__res last-row__res--${res}">${res}</span>
      <span class="last-row__match">${teamName(r.strHomeTeam)} <b>${r.intHomeScore ?? "-"} - ${r.intAwayScore ?? "-"}</b> ${teamName(r.strAwayTeam)}</span>
      <span class="last-row__meta">${r.strLeague || ""} · ${fmtFecha(r.dateEvent)}</span>
    </div>`;
}

function renderTeam(esName, data) {
  const { tsdb, squad } = data;
  const team = (tsdb && tsdb.team) || {};
  const last = (tsdb && tsdb.last) || [];
  const localTeam = GROUPS.flatMap((g) => g.teams).find((t) => t.name === esName);
  const crest = team.strBadge || (localTeam ? localTeam.img : "");

  // Jugadores: plantel FIFA completo (26) si existe; si no, lo de TheSportsDB.
  // El endpoint squad usa Position 0-3 = arquero/defensa/medio/delantero.
  const FIFA_POS = ["Goalkeeper", "Defender", "Midfield", "Forward"];
  const players = squad
    ? (squad.Players || []).map((p) => ({
        strPlayer: loc(p.PlayerName),
        strCutout: (p.PlayerPicture && p.PlayerPicture.PictureUrl) || "",
        strNumber: p.JerseyNum != null ? String(p.JerseyNum) : "",
        strPosition: FIFA_POS[p.Position] || "",
        strTeam: esName,
        idPlayer: p.IdPlayer,
        idTeam: squad.IdTeam,
      }))
    : (tsdb && tsdb.players) || [];

  // En el endpoint squad, el técnico (DT) es el oficial con Role === 0.
  const fifaCoach =
    squad && (squad.Officials || []).find((c) => c.Role === 0);
  const coach = players.find((p) => posGroup(p.strPosition) === "dt");
  const coachName =
    (fifaCoach && loc(fifaCoach.Name)) || (coach && coach.strPlayer) || team.strManager || "";
  const desc = team.strDescriptionES || team.strDescriptionEN || "";
  const descCorta = desc.length > 420 ? desc.slice(0, 420).trimEnd() + "…" : desc;

  const grupos = POS_ES.map(([key, label]) => {
    const lista = players.filter((p) => posGroup(p.strPosition) === key);
    if (!lista.length) return "";
    return `<h3 class="tm-sub">${label}</h3>
      <div class="players-grid">${lista.map(playerCard).join("")}</div>`;
  }).join("");

  $teamContent.innerHTML = `
    <div class="tm-head">
      <img class="tm-crest" src="${crest}" alt="" />
      <div>
        <h2 class="tm-name">${esName}</h2>
        ${coachName ? `<p class="tm-coach">Técnico: <b>${coachName}</b></p>` : ""}
      </div>
    </div>
    <div class="modal-pad">
      ${descCorta ? `<p class="tm-desc">${descCorta}</p>` : ""}
      ${grupos || `<p class="placeholder">La API aún no publica el plantel de esta selección.</p>`}
      <h3 class="tm-sub">Últimos partidos</h3>
      ${last.length
        ? `<div class="last-list">${last.slice(0, 5).map((r) => lastMatchRow(r, team.idTeam)).join("")}</div>`
        : `<p class="placeholder">Sin partidos recientes en la API.</p>`}
    </div>`;
}

// Token para que, si se abren varias selecciones seguidas, solo la última
// escriba en el modal (evita que una petición lenta pise a la más reciente).
let teamReqId = 0;
async function openTeam(esName) {
  const myReq = ++teamReqId;
  openModal($teamModal);
  $teamContent.innerHTML = spinnerHTML(`Cargando ${esName}...`);
  try {
    const data = teamCache[esName] || (teamCache[esName] = fetchTeam(esName));
    const resolved = await data;
    if (myReq !== teamReqId) return; // llegó otra apertura después: se ignora
    renderTeam(esName, resolved);
  } catch (err) {
    delete teamCache[esName];
    if (myReq === teamReqId) $teamContent.innerHTML = modalError(err.message);
  }
}

// Clic en una tarjeta de jugador (dentro del modal de selección) -> modal jugador.
$teamContent.addEventListener("click", (e) => {
  const card = e.target.closest(".player-card[data-player]");
  if (card) openPlayer(card.dataset.player, card.dataset.team);
});

// =====================================================================
// DETALLE DE JUGADOR (foto grande + datos)
// =====================================================================
const PIE_ES = { 1: "Derecho", 2: "Izquierdo", 3: "Ambos" };
const playerByIdCache = {};
function fifaPlayer(idPlayer) {
  if (!playerByIdCache[idPlayer]) {
    playerByIdCache[idPlayer] = fifaApi(`players/${idPlayer}`).catch(() => null);
  }
  return playerByIdCache[idPlayer];
}

function edad(birth) {
  if (!birth) return null;
  const ms = Date.now() - new Date(birth).getTime();
  const a = Math.floor(ms / 31557600000);
  return a > 0 && a < 60 ? a : null;
}

let playerReqId = 0;
async function openPlayer(idPlayer, idTeam) {
  if (!idPlayer) return;
  const myReq = ++playerReqId;
  openModal($playerModal);
  $playerContent.innerHTML = spinnerHTML("Cargando jugador...");
  try {
    const [squad, info, meta] = await Promise.all([
      idTeam ? fifaSquadById(idTeam) : Promise.resolve(null),
      fifaPlayer(idPlayer),
      fifaTeamMeta().catch(() => ({})),
    ]);
    if (myReq !== playerReqId) return;
    const sp = squad && (squad.Players || []).find((p) => p.IdPlayer === idPlayer);
    if (!sp && !info) {
      $playerContent.innerHTML = modalError("No se encontraron datos de este jugador.");
      return;
    }
    renderPlayer({ sp, info, idPlayer, tm: (meta && meta[idTeam]) || {} });
  } catch (err) {
    if (myReq === playerReqId) $playerContent.innerHTML = modalError(err.message);
  }
}

function renderPlayer({ sp, info, idPlayer, tm }) {
  const nombre = (sp && loc(sp.PlayerName)) || (info && loc(info.Name)) || "Jugador";
  const foto = (sp && sp.PlayerPicture && sp.PlayerPicture.PictureUrl) || "";
  tm = tm || {};
  const posLabel = sp ? loc(sp.PositionLocalized) : "";
  const num = sp && sp.JerseyNum != null ? sp.JerseyNum : null;
  const aniosNac = info && info.BirthDate ? new Date(info.BirthDate).getFullYear() : (sp && sp.BirthDate ? new Date(sp.BirthDate).getFullYear() : null);
  const a = edad((info && info.BirthDate) || (sp && sp.BirthDate));
  const altura = (sp && sp.Height) || (info && info.Height);
  const peso = (sp && sp.Weight) || (info && info.Weight);
  const pie = info && PIE_ES[info.PreferredFoot];
  const caps = info && info.InternationalCaps;
  const golesCarrera = info && info.Goals;
  const torneo = (golTally && golTally[idPlayer]) || null;

  const dato = (label, val) => (val || val === 0 ? `<div class="pl-dato"><span>${label}</span><b>${val}</b></div>` : "");

  $playerContent.innerHTML = `
    <div class="pl-head">
      ${foto
        ? `<img class="pl-photo" src="${foto}" alt="" onerror="this.outerHTML='<span class=\\'pl-photo pl-photo--ph\\'>${(nombre[0] || "?")}</span>'" />`
        : `<span class="pl-photo pl-photo--ph">${nombre[0] || "?"}</span>`}
      <div class="pl-headinfo">
        ${num != null ? `<span class="pl-num">#${num}</span>` : ""}
        <h2 class="pl-name">${nombre}</h2>
        <p class="pl-team">${tm.name || ""}${posLabel ? ` · ${posLabel}` : ""}</p>
      </div>
    </div>
    <div class="modal-pad">
      <div class="pl-grid">
        ${dato("Edad", a ? `${a} años` : "")}
        ${dato("Nacimiento", aniosNac)}
        ${dato("Estatura", altura ? `${Math.round(altura)} cm` : "")}
        ${dato("Peso", peso ? `${Math.round(peso)} kg` : "")}
        ${dato("Pie hábil", pie)}
        ${dato("Partidos internac.", caps)}
        ${dato("Goles (selección)", golesCarrera)}
      </div>
      ${torneo
        ? `<h3 class="tm-sub">En el Mundial 2026</h3>
           <div class="pl-tourney">
             <div class="pl-stat"><b>${torneo.goles}</b><span>⚽ Goles</span></div>
             <div class="pl-stat"><b>${torneo.asist}</b><span>🅰️ Asist.</span></div>
             <div class="pl-stat"><b>${torneo.amarillas}</b><span>🟨 Amar.</span></div>
             <div class="pl-stat"><b>${torneo.rojas}</b><span>🟥 Rojas</span></div>
           </div>`
        : ""}
    </div>`;
}

// =====================================================================
// DETALLE DE PARTIDO (alineaciones, goles/momentos, estadísticas)
// =====================================================================
const STAT_ES = {
  "Ball Possession": "Posesión",
  "Total Shots": "Remates",
  "Shots on Goal": "Remates al arco",
  "Shots off Goal": "Remates desviados",
  "Blocked Shots": "Remates bloqueados",
  "Corner Kicks": "Tiros de esquina",
  Fouls: "Faltas",
  Offsides: "Fueras de juego",
  "Yellow Cards": "Tarjetas amarillas",
  "Red Cards": "Tarjetas rojas",
  "Goalkeeper Saves": "Atajadas",
  "Shots insidebox": "Remates en el área",
  "Shots outsidebox": "Remates fuera del área",
  "Total passes": "Pases totales",
  "Passes accurate": "Pases acertados",
  "Passes %": "Precisión de pases",
};

function timelineIcon(t) {
  const det = (t.strTimelineDetail || "").toLowerCase();
  const tipo = (t.strTimeline || "").toLowerCase();
  if (tipo === "goal") return det.includes("penalty") ? "⚽ (pen)" : det.includes("own") ? "⚽ (e.c.)" : "⚽";
  if (tipo === "card") return det.includes("red") ? "🟥" : "🟨";
  if (tipo === "subst") return "🔁";
  if (tipo === "var") return "📺 VAR";
  return "•";
}

// Detalle del partido directo desde FIFA por stage+id (sin cruces difusos):
// alineaciones de 26, táctica, técnico, árbitro y minuto a minuto en español.
async function fetchMatch(stage, id) {
  const [detailRaw, events, cal] = await Promise.all([
    fifaApi(`live/football/${FIFA_COMP}/${FIFA_SEASON}/${stage}/${id}`).catch(() => null),
    fifaApi(`timelines/${FIFA_COMP}/${FIFA_SEASON}/${stage}/${id}`).then((d) => d.Event || []).catch(() => []),
    fifaCalendar().catch(() => []),
  ]);
  const calMatch = (cal || []).find((c) => String(c.id) === String(id)) || null;
  let detail = detailRaw;
  // Eliminatorias aún sin equipos: FIFA devuelve null. Armamos un detalle
  // mínimo desde el calendario para mostrar sede, ronda y dónde ver.
  if (!detail || !detail.HomeTeam) {
    if (!calMatch) throw new Error("No se pudo cargar el detalle del partido.");
    const tn = (s) => [{ Description: s || "" }];
    const lado = (nombre, idT) => ({ TeamName: tn(nombre), IdTeam: idT, Players: [], Score: null, Tactics: "", Coaches: [] });
    detail = {
      MatchStatus: calMatch.status,
      MatchTime: "",
      Date: calMatch.ts ? new Date(calMatch.ts).toISOString() : null,
      StageName: tn(calMatch.stageName),
      GroupName: tn(calMatch.group),
      Stadium: { Name: tn(calMatch.venue) },
      Officials: [],
      HomeTeam: lado(calMatch.home, calMatch.homeId),
      AwayTeam: lado(calMatch.away, calMatch.awayId),
    };
  }
  return { detail, events, standings: computeGroupStandings(cal || []), calMatch };
}

// Fila de la tabla de un equipo (en cualquier grupo).
function teamStandRow(standings, idTeam) {
  for (const gn in standings) {
    const r = standings[gn].find((x) => x.id === idTeam);
    if (r) return r;
  }
  return null;
}
// Pronóstico simple (no son cuotas): a partir del rendimiento en el torneo.
function matchOdds(idHome, idAway, standings) {
  const H = teamStandRow(standings, idHome), A = teamStandRow(standings, idAway);
  if (!H || !A || !H.pj || !A.pj) return null; // hace falta que ambos hayan jugado
  const fuerza = (r) => r.pts / r.pj + (r.dg / r.pj) * 0.35;
  const diff = Math.max(-2, Math.min(2, fuerza(H) - fuerza(A))); // acotar extremos
  const eH = Math.exp(0.7 * diff), eA = Math.exp(-0.7 * diff);
  const empate = 0.3 / (1 + Math.abs(diff) * 0.6);
  const pH = (eH / (eH + eA)) * (1 - empate);
  const pA = (eA / (eH + eA)) * (1 - empate);
  const tot = pH + pA + empate;
  const h = Math.round((pH / tot) * 100);
  const a = Math.round((pA / tot) * 100);
  return { h, a, e: 100 - h - a };
}

function lineupCol(lista, titulo) {
  if (!lista.length) return "";
  return `
    <div class="lu-col">
      <h4>${titulo}</h4>
      ${lista
        .map(
          (p) => `<div class="lu-row">
            <span class="lu-num">${p.intSquadNumber || ""}</span>
            <span class="lu-name">${p.strPlayer || ""}</span>
            ${p.strSubstitute === "Yes" ? `<span class="lu-sub">supl.</span>` : ""}
          </div>`
        )
        .join("")}
    </div>`;
}

// Columna de alineación con datos FIFA (titulares, banca, táctica y DT).
function fifaLineupCol(team) {
  const tit = (team.Players || []).filter((p) => p.Status === 1);
  const sup = (team.Players || []).filter((p) => p.Status !== 1);
  const coach = (team.Coaches || []).find((c) => c.Role === 1) || (team.Coaches || [])[0];
  const row = (p) => `<div class="lu-row">
      <span class="lu-num">${p.ShirtNumber ?? ""}</span>
      <span class="lu-name">${loc(p.PlayerName)}${p.Captain ? " <b>(C)</b>" : ""}</span>
    </div>`;
  return `<div class="lu-col">
    <h4>${loc(team.TeamName)}${team.Tactics ? ` · ${team.Tactics}` : ""}</h4>
    ${coach ? `<p class="lu-dt">DT: <b>${loc(coach.Name)}</b></p>` : ""}
    ${tit.map(row).join("")}
    ${sup.length ? `<p class="lu-banca">Banca</p>${sup.map(row).join("")}` : ""}
  </div>`;
}

// ---- Formación dibujada en la cancha (a partir del string de táctica) ----
// FIFA no entrega coordenadas (LineupX/Y vienen vacías), pero sí la táctica
// ("4-1-2-3") y los titulares EN ORDEN de formación, así que ubicamos por filas.
function parseTactics(str, nOutfield) {
  const rows = String(str || "").split("-").map(Number).filter((n) => n > 0);
  const suma = rows.reduce((a, b) => a + b, 0);
  return rows.length && suma === nOutfield ? rows : null;
}
function sliceRows(arr, sizes) {
  const out = [];
  let i = 0;
  for (const s of sizes) {
    out.push(arr.slice(i, i + s));
    i += s;
  }
  return out;
}
// Asigna _x/_y (en %) a los 11 titulares de un equipo según su lado del campo.
function placeTeam(team, side) {
  const starters = (team.Players || []).filter((p) => p.Status === 1);
  if (starters.length < 11) return null;
  const gk = starters[0];
  const outfield = starters.slice(1);
  const rows = parseTactics(team.Tactics, outfield.length);
  const cols = rows ? [[gk], ...sliceRows(outfield, rows)] : [[gk], outfield];
  const n = cols.length;
  cols.forEach((col, ci) => {
    const frac = n > 1 ? ci / (n - 1) : 0; // 0 = arquero (atrás) → 1 = delanteros (centro)
    const xHome = 5 + frac * 41;
    const x = side === "home" ? xHome : 100 - xHome;
    col.forEach((p, pi) => {
      p._x = x;
      p._y = (100 / (col.length + 1)) * (pi + 1);
    });
  });
  return cols.flat();
}
function pitchDot(p, side) {
  const apellido = (loc(p.PlayerName) || "").trim().split(/\s+/).pop() || "";
  return `<div class="pitch-dot pitch-dot--${side}" style="left:${p._x}%;top:${p._y}%">
    <span class="pitch-num">${p.ShirtNumber ?? ""}</span>
    <span class="pitch-name">${apellido}${p.Captain ? " (C)" : ""}</span>
  </div>`;
}
function fifaPitch(home, away) {
  const ph = placeTeam(home, "home");
  const pa = placeTeam(away, "away");
  if (!ph || !pa) return "";
  return `<div class="pitch" role="img" aria-label="Formaciones: ${loc(home.TeamName)} ${home.Tactics || ""} vs ${loc(away.TeamName)} ${away.Tactics || ""}">
    <div class="pitch-mid"></div><div class="pitch-circle"></div>
    <span class="pitch-tac pitch-tac--home">${home.Tactics || ""}</span>
    <span class="pitch-tac pitch-tac--away">${away.Tactics || ""}</span>
    ${ph.map((p) => pitchDot(p, "home")).join("")}
    ${pa.map((p) => pitchDot(p, "away")).join("")}
  </div>`;
}

// Momentos con datos FIFA (descripciones ya en español).
const FIFA_EV_ICON = { 0: "⚽", 2: "🟨", 3: "🟥", 5: "🔁", 71: "📺" };

// Estadísticas contadas desde el minuto a minuto de FIFA (útil sobre todo
// en vivo, cuando TheSportsDB todavía no publica las suyas).
const FIFA_STAT_TYPES = [
  [12, "Remates a puerta"],
  [57, "Atajadas"],
  [16, "Tiros de esquina"],
  [18, "Faltas"],
  [15, "Fueras de juego"],
  [2, "Tarjetas amarillas"],
  [3, "Tarjetas rojas"],
];
function fifaStats(events, idHome) {
  if (!events || !events.length || !idHome) return [];
  return FIFA_STAT_TYPES.map(([type, label]) => {
    const delTipo = events.filter((t) => t.Type === type);
    if (!delTipo.length) return null;
    const h = delTipo.filter((t) => t.IdTeam === idHome).length;
    return { strStat: label, intHome: h, intAway: delTipo.length - h };
  }).filter(Boolean);
}
function fifaMomentoRow(t, idHome) {
  const desc = loc(t.EventDescription) || loc(t.TypeLocalized);
  return `<div class="tl-row ${t.IdTeam === idHome ? "is-home" : "is-away"}">
    <span class="tl-min">${t.MatchMinute || ""}</span>
    <span class="tl-ico">${FIFA_EV_ICON[t.Type] || "•"}</span>
    <span class="tl-txt">${desc}${t.Type === 0 ? ` <b>(${t.HomeGoals}-${t.AwayGoals})</b>` : ""}</span>
  </div>`;
}

function statBar(s) {
  const h = Number(s.intHome) || 0;
  const a = Number(s.intAway) || 0;
  const total = h + a || 1;
  return `
    <div class="stat-row">
      <span class="stat-row__v">${s.intHome ?? 0}</span>
      <div class="stat-row__mid">
        <span class="stat-row__label">${STAT_ES[s.strStat] || s.strStat}</span>
        <div class="stat-row__bar">
          <span style="width:${(h / total) * 100}%"></span><span style="width:${(a / total) * 100}%"></span>
        </div>
      </div>
      <span class="stat-row__v">${s.intAway ?? 0}</span>
    </div>`;
}

// Partidos por señal abierta (Caracol/RCN). Lista oficial de fase de grupos +
// los de Colombia (detectados aparte) + semifinales y final (por StageName).
// Clave por par de nombres (sin orden, sin acentos). Agregar aquí los demás
// que confirmen los canales (p. ej. los de eliminatorias cuando se sepan).
const tvPairKey = (a, b) => [normTxt(a), normTxt(b)].sort().join("|");
const FREE_TO_AIR_PAIRS = new Set([
  tvPairKey("México", "Sudáfrica"),
  tvPairKey("Estados Unidos", "Paraguay"),
  tvPairKey("Brasil", "Marruecos"),
  tvPairKey("Países Bajos", "Japón"),
  tvPairKey("España", "Cabo Verde"),
  tvPairKey("Argentina", "Argelia"),
  tvPairKey("Uzbekistán", "Colombia"),
  tvPairKey("Suiza", "Bosnia y Herzegovina"),
  tvPairKey("Escocia", "Marruecos"),
  tvPairKey("Alemania", "Costa de Marfil"),
  tvPairKey("Bélgica", "Irán"),
  tvPairKey("Argentina", "Austria"),
  tvPairKey("Colombia", "R.D. Congo"),
  tvPairKey("Escocia", "Brasil"),
  tvPairKey("Ecuador", "Alemania"),
  tvPairKey("Uruguay", "España"),
  tvPairKey("Colombia", "Portugal"),
]);
// Rondas finales que Caracol/RCN pasan completas por señal abierta.
const FREE_TO_AIR_STAGES = /^(Semifinal|Final)$/i;

// Partidos que transmite Disney+ (ESPN) en Colombia: 22 de grupos (lista ESPN)
// + los de Colombia + semifinales y final. Eliminatorias específicas: pendientes.
const DISNEY_PAIRS = new Set([
  tvPairKey("México", "Sudáfrica"),
  tvPairKey("Canadá", "Bosnia y Herzegovina"),
  tvPairKey("Estados Unidos", "Paraguay"),
  tvPairKey("Brasil", "Marruecos"),
  tvPairKey("Países Bajos", "Japón"),
  tvPairKey("Costa de Marfil", "Ecuador"),
  tvPairKey("España", "Cabo Verde"),
  tvPairKey("Arabia Saudita", "Uruguay"),
  tvPairKey("Argentina", "Argelia"),
  tvPairKey("Uzbekistán", "Colombia"),
  tvPairKey("Suiza", "Bosnia y Herzegovina"),
  tvPairKey("Alemania", "Costa de Marfil"),
  tvPairKey("Ecuador", "Curazao"),
  tvPairKey("España", "Arabia Saudita"),
  tvPairKey("Bélgica", "Irán"),
  tvPairKey("Argentina", "Austria"),
  tvPairKey("Colombia", "R.D. Congo"),
  tvPairKey("Brasil", "Escocia"),
  tvPairKey("Ecuador", "Alemania"),
  tvPairKey("Noruega", "Francia"),
  tvPairKey("Uruguay", "España"),
  tvPairKey("Colombia", "Portugal"),
  tvPairKey("Jordania", "Argentina"),
]);

function renderMatch(data) {
  const { detail, events, standings, calMatch } = data;
  const home = detail.HomeTeam, away = detail.AwayTeam;
  const th = groupTeamForFifa(loc(home.TeamName)), ta = groupTeamForFifa(loc(away.TeamName));
  const nh = th ? th.name : loc(home.TeamName) || "Por definir";
  const na = ta ? ta.name : loc(away.TeamName) || "Por definir";
  const ch = th ? th.img : "", ca = ta ? ta.img : "";
  const stageName = (calMatch && calMatch.stageName) || loc(detail.StageName);
  const idHome = home.IdTeam;
  const estado = fifaState(detail.MatchStatus);
  const d = new Date(detail.Date);
  const minuto = detail.MatchTime || "";
  const centro =
    estado === "prog"
      ? `<span class="mm-time">${isNaN(d.getTime()) ? "vs" : fmtHoraLocal(d)}</span>`
      : `<span class="mm-score">${home.Score ?? "·"} - ${away.Score ?? "·"}</span>`;
  const estadoTxt =
    estado === "live"
      ? `<span class="mc__live">● En vivo${minuto ? " " + minuto : ""}</span>`
      : estado === "fin"
        ? `<span class="mc__ft">Final</span>`
        : !isNaN(d.getTime())
          ? `<span class="mm-date">${fmtFechaLocal(d)}</span>`
          : "";

  const arbitro = (detail.Officials || []).find((o) => o.OfficialType === 1);
  const venue = loc(detail.Stadium && detail.Stadium.Name);
  const meta = [
    venue ? `📍 ${venue}` : "",
    loc(detail.GroupName) || stageName,
    detail.Attendance ? `👥 ${Number(detail.Attendance).toLocaleString("es")}` : "",
    arbitro ? `🟡 ${loc(arbitro.Name)}` : "",
  ].filter(Boolean).join(" · ");

  const momentos = (events || []).filter((t) => t.Type in FIFA_EV_ICON);
  const momentosHTML = momentos.length
    ? `<h3 class="tm-sub">Momentos del partido</h3><div class="tl-list">${momentos.map((t) => fifaMomentoRow(t, idHome)).join("")}</div>`
    : "";

  const tieneAlin = (home.Players || []).length || (away.Players || []).length;
  const alinHTML = tieneAlin
    ? `<h3 class="tm-sub">Alineaciones</h3>${fifaPitch(home, away)}<div class="lu-grid">${fifaLineupCol(home)}${fifaLineupCol(away)}</div>`
    : `<h3 class="tm-sub">Alineaciones</h3><p class="placeholder">Las alineaciones aparecen cerca de la hora del partido.</p>`;

  const statsArr = fifaStats(events, idHome);
  const statsHTML = statsArr.length
    ? `<h3 class="tm-sub">Estadísticas</h3><div class="stats-list">${statsArr.map(statBar).join("")}</div>`
    : "";

  // Pronóstico solo para partidos por jugar (en vivo/terminado ya se ve el marcador).
  const odds = estado === "prog" ? matchOdds(idHome, away.IdTeam, standings) : null;
  const oddsHTML = odds
    ? `<h3 class="tm-sub">Pronóstico</h3>
       <div class="odds">
         <div class="odds-bar"><span class="odds-h" style="width:${odds.h}%"></span><span class="odds-e" style="width:${odds.e}%"></span><span class="odds-a" style="width:${odds.a}%"></span></div>
         <div class="odds-legend"><span><b>${odds.h}%</b> ${nh}</span><span><b>${odds.e}%</b> Empate</span><span><b>${odds.a}%</b> ${na}</span></div>
         <p class="odds-note">Estimación según el rendimiento en el torneo · no son cuotas reales.</p>
       </div>`
    : "";

  // Dónde ver (Colombia). DSports/DGO + Paramount+ tienen los 104; Caracol/RCN
  // (señal abierta gratis) y Disney+ solo en partidos confirmados.
  const pareja = tvPairKey(nh, na);
  const hayCol = [nh, na].includes("Colombia");
  const finales = FREE_TO_AIR_STAGES.test(stageName);
  const senalAbierta = hayCol || finales || FREE_TO_AIR_PAIRS.has(pareja);
  const disney = hayCol || finales || DISNEY_PAIRS.has(pareja);
  const pagos = ["DSports/DGO", "Paramount+"].concat(disney ? ["Disney+"] : []).join(", ");
  const verHTML = `<h3 class="tm-sub">Dónde ver (Colombia)</h3>
    <div class="watch">
      <span class="watch-chip">DSports / DGO</span>
      <span class="watch-chip">Paramount+</span>
      ${disney ? `<span class="watch-chip">Disney+</span>` : ""}
      ${senalAbierta ? `<span class="watch-chip watch-chip--free">📺 Caracol</span><span class="watch-chip watch-chip--free">📺 RCN</span>` : ""}
    </div>
    <p class="watch-note">${senalAbierta
      ? `Gratis en señal abierta por <b>Caracol</b> y <b>RCN</b>. También por ${pagos}.`
      : `Disponible por <b>${pagos}</b> · este partido no va por señal abierta.`}</p>`;

  // Resumen / video en YouTube (búsqueda directa; los resúmenes salen tras el partido).
  const definido = nh !== "Por definir" && na !== "Por definir";
  const ytTerm = estado === "prog" ? "previa" : "resumen goles";
  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${nh} vs ${na} ${ytTerm} Mundial 2026`)}`;
  const ytLabel = estado === "fin" ? "Ver resumen y goles" : estado === "live" ? "Ver clips en vivo" : "Ver previa";
  const ytHTML = definido
    ? `<h3 class="tm-sub">Resumen en video</h3>
       <a class="yt-btn" href="${ytUrl}" target="_blank" rel="noopener">▶ ${ytLabel} en YouTube</a>
       <p class="watch-note">Abre YouTube con ${estado === "fin" ? "el resumen y los goles" : estado === "live" ? "los clips" : "la previa"} del partido.</p>`
    : "";

  $matchContent.innerHTML = `
    <div class="mm-head">
      <div class="mm-team"><img src="${ch}" alt="" /><span>${nh}</span></div>
      <div class="mm-center">${centro}${estadoTxt}</div>
      <div class="mm-team"><img src="${ca}" alt="" /><span>${na}</span></div>
    </div>
    <div class="modal-pad">
      ${meta ? `<p class="mm-meta">${meta}</p>` : ""}
      ${estado !== "prog" ? ytHTML : ""}
      ${momentosHTML}
      ${alinHTML}
      ${statsHTML}
      ${oddsHTML}
      ${verHTML}
      ${estado === "prog" ? ytHTML : ""}
    </div>`;
}

const matchCache = {};

let matchReqId = 0;
async function openMatch(stage, id) {
  const myReq = ++matchReqId;
  openModal($matchModal);
  $matchContent.innerHTML = spinnerHTML("Cargando partido...");
  try {
    // Los partidos en vivo no se cachean para ver siempre lo último.
    let data = matchCache[id];
    if (!data) {
      data = await fetchMatch(stage, id);
      if (fifaState(data.detail.MatchStatus) === "fin") matchCache[id] = data;
    }
    if (myReq !== matchReqId) return; // se abrió otro partido después
    renderMatch(data);
  } catch (err) {
    if (myReq === matchReqId) $matchContent.innerHTML = modalError(err.message);
  }
}
