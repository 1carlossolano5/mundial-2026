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
        (d.Results || []).map((m) => ({
          id: m.IdMatch,
          stage: m.IdStage,
          ts: Date.parse(m.Date),
          home: loc(m.Home && m.Home.TeamName),
          away: loc(m.Away && m.Away.TeamName),
          homeId: m.Home && m.Home.IdTeam,
          awayId: m.Away && m.Away.IdTeam,
          goals: (Number(m.Home && m.Home.Score) || 0) + (Number(m.Away && m.Away.Score) || 0),
        }))
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

// Nombre del goleador desde la descripción ("¡Goool de Julian QUINONES (México)!").
function scorerName(desc) {
  if (!desc) return null;
  let s = desc.replace(/\s*\([^()]*\)\s*!?\.?$/, "").trim(); // quita "(País)!" final
  const idx = s.toLowerCase().lastIndexOf(" de ");
  if (idx !== -1) s = s.slice(idx + 4); // se queda con lo posterior al último " de "
  return s.trim() || null;
}

// ---- Goleadores (calculados del minuto a minuto, FIFA no da endpoint útil) ----
let goleadoresCargado = false;
const $golList = document.getElementById("golList");
const $golStatus = document.getElementById("golStatus");
const golTimelineCache = {};

function timelineForMatch(m) {
  if (!golTimelineCache[m.id]) {
    golTimelineCache[m.id] = fifaApi(`timelines/${FIFA_COMP}/${FIFA_SEASON}/${m.stage}/${m.id}`)
      .then((d) => d.Event || [])
      .catch(() => []);
  }
  return golTimelineCache[m.id];
}

async function loadScorers() {
  goleadoresCargado = true;
  $golStatus.hidden = false;
  $golList.innerHTML = "";
  try {
    const [cal, meta] = await Promise.all([fifaCalendar(), fifaTeamMeta()]);
    // Solo partidos con goles (evita pedir timelines de 0-0 o no jugados).
    const conGoles = cal.filter((m) => m.goals > 0);
    const listas = await poolMap(conGoles, 6, timelineForMatch);

    const tally = {}; // IdPlayer → { goles, asist, name, idTeam }
    listas.forEach((events) => {
      (events || []).forEach((e) => {
        if (e.Type !== 0 && e.Type !== 1) return; // 0 = gol, 1 = asistencia
        const key = e.IdPlayer || "d:" + loc(e.EventDescription);
        const t =
          tally[key] ||
          (tally[key] = { goles: 0, asist: 0, name: scorerName(loc(e.EventDescription)), idTeam: e.IdTeam });
        if (e.Type === 0) t.goles++;
        else t.asist++;
        if (!t.name) t.name = scorerName(loc(e.EventDescription));
      });
    });

    const rows = Object.values(tally)
      .filter((t) => t.goles > 0)
      .sort(
        (a, b) =>
          b.goles - a.goles || b.asist - a.asist || (a.name || "").localeCompare(b.name || "")
      );

    $golStatus.hidden = true;
    if (!rows.length) {
      $golList.innerHTML = `<p class="placeholder">Todavía no hay goles registrados. La tabla se llenará a medida que se jueguen los partidos.</p>`;
      return;
    }

    let pos = 0;
    let prevG = null;
    $golList.innerHTML =
      `<div class="scorer-row scorer-row--head"><span>#</span><span>Jugador</span><span title="Goles">G</span><span title="Asistencias">A</span></div>` +
      rows
        .map((t, i) => {
          if (t.goles !== prevG) {
            pos = i + 1;
            prevG = t.goles;
          }
          const tm = meta[t.idTeam] || {};
          return `<div class="scorer-row">
            <span class="scorer-pos">${pos}</span>
            <span class="scorer-name">${tm.flag ? tm.flag + " " : ""}${t.name || "—"}<small>${tm.name || ""}</small></span>
            <span class="scorer-g">${t.goles}</span>
            <span class="scorer-a">${t.asist}</span>
          </div>`;
        })
        .join("");
  } catch (err) {
    $golStatus.hidden = true;
    goleadoresCargado = false; // permitir reintentar al volver a entrar
    $golList.innerHTML = `<p class="placeholder">${err.message}</p>`;
  }
}

// ---- Grupos ----
let gruposCargados = false;
const $gruposGrid = document.getElementById("gruposGrid");
const $gruposStatus = document.getElementById("gruposStatus");

function loadGroups() {
  gruposCargados = true;
  $gruposStatus.hidden = true;
  $gruposGrid.innerHTML = GROUPS.map((g) => {
    return `
    <div class="group-card">
      <div class="group-card__head">
        <span>Grupo ${g.letter}</span>
      </div>
      ${g.teams
        .map(
          (t) => `
        <button class="group-row" data-team="${t.name}" aria-label="Ver jugadores y datos de ${t.name}">
          <img class="group-row__crest" src="${t.img}" alt="" loading="lazy" />
          <span class="group-row__name">${t.name}</span>
          <span class="group-row__go" aria-hidden="true">→</span>
        </button>`
        )
        .join("")}
    </div>`;
  }).join("");
}

// Clic en una selección -> modal con jugadores, técnico y últimos partidos.
$gruposGrid.addEventListener("click", (e) => {
  const row = e.target.closest(".group-row[data-team]");
  if (row) openTeam(row.dataset.team);
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

// Estado de un partido según la API: "fin" (terminado), "live" (en juego) o "prog" (programado).
const ST_FIN = ["Match Finished", "FT", "AET", "PEN", "Full Time", "After Extra Time", "Penalties"];
const ST_NO_INICIADO = ["", "Not Started", "NS", "TBD", "Time to be defined", "Postponed", "POSTP", "Cancelled", "CANC"];
function matchState(e) {
  const st = (e.strStatus || "").trim();
  const conMarcador = e.intHomeScore != null && e.intAwayScore != null;
  if (ST_FIN.includes(st)) return "fin";
  if (conMarcador && !ST_NO_INICIADO.includes(st)) return "live";
  if (conMarcador) return "fin";
  return "prog";
}

function matchCard(e) {
  const estado = matchState(e);
  const d = matchDate(e);
  const hora = d ? fmtHoraLocal(d) : (e.strTime || "").slice(0, 5) || "vs";
  const centro =
    estado === "prog"
      ? `<span class="mc__time">${hora}</span>`
      : `<span class="mc__score">${e.intHomeScore ?? "·"} - ${e.intAwayScore ?? "·"}</span>`;
  const bajoCentro =
    estado === "fin"
      ? `<span class="mc__ft">Final</span>`
      : estado === "live"
        ? `<span class="mc__live">● En vivo${e.strProgress ? ` ${e.strProgress}'` : ""}</span>`
        : "";
  return `
    <button class="match-card ${estado === "fin" ? "is-played" : ""} ${estado === "live" ? "is-live" : ""}" data-id="${e.idEvent}" aria-label="Ver detalle de ${teamName(e.strHomeTeam)} vs ${teamName(e.strAwayTeam)}">
      <div class="mc__team mc__home">
        <span>${teamName(e.strHomeTeam)}</span>
        <img src="${e.strHomeTeamBadge || ""}" alt="" loading="lazy" />
      </div>
      <div class="mc__center">${centro}${bajoCentro}</div>
      <div class="mc__team mc__away">
        <img src="${e.strAwayTeamBadge || ""}" alt="" loading="lazy" />
        <span>${teamName(e.strAwayTeam)}</span>
      </div>
      ${e.strVenue ? `<div class="mc__venue">📍 ${e.strVenue}</div>` : ""}
    </button>`;
}

// Jornadas de grupos (1-3) + códigos de rondas de eliminatorias de TheSportsDB
// (125 Final, 126 Semis, 127 Cuartos, 128 Octavos/16avos, 129 32avos).
const CAL_ROUNDS = [1, 2, 3, 129, 128, 127, 126, 125];

// Trae todas las jornadas/rondas en paralelo y las combina sin duplicados.
async function fetchCalendarEvents() {
  const listas = await Promise.all(
    CAL_ROUNDS.map((r) =>
      api("eventsround.php", { id: WC_LEAGUE, r, s: SEASON })
        .then((d) => d.events || [])
        .catch(() => [])
    )
  );
  const vistos = new Set();
  const events = [];
  for (const lista of listas) {
    for (const e of lista) {
      if (e && e.idEvent && !vistos.has(e.idEvent)) {
        vistos.add(e.idEvent);
        events.push(e);
      }
    }
  }
  events.sort((a, b) => (a.strTimestamp || "").localeCompare(b.strTimestamp || ""));
  return events;
}

function renderCalendar(events) {
  if (!events.length) {
    $calList.innerHTML = `<p class="placeholder">Aún no hay partidos publicados por la API. Aparecerán a medida que se acerque y juegue el torneo.</p>`;
    return;
  }
  let html = "";
  let claveActual = "";
  for (const e of events) {
    const d = matchDate(e);
    const clave = d ? d.toLocaleDateString("en-CA") : e.dateEvent;
    if (clave !== claveActual) {
      claveActual = clave;
      const label = d ? fmtFechaLocal(d) : fmtFecha(e.dateEvent);
      html += `<h3 class="cal-date">${label}</h3>`;
    }
    html += matchCard(e);
  }
  $calList.innerHTML = html;
}

async function loadCalendar() {
  calendarioCargado = true;
  $calStatus.hidden = false;
  $calList.innerHTML = "";
  try {
    const events = await fetchCalendarEvents();
    $calStatus.hidden = true;
    renderCalendar(events);
  } catch (err) {
    $calStatus.hidden = true;
    calendarioCargado = false; // permitir reintentar al volver a entrar
    $calList.innerHTML = `<p class="placeholder">${err.message}</p>`;
  }
}

// ---- Refresco automático (resultados en vivo) ----
// Cada 60s, solo mientras la vista Calendario está activa y sin tocar el
// scroll del usuario: se re-renderiza con los datos nuevos en silencio.
const CAL_REFRESH_MS = 60000;
let calTimer = null;
function startCalRefresh() {
  if (calTimer) return;
  calTimer = setInterval(async () => {
    if (document.hidden || !calendarioCargado) return;
    try {
      renderCalendar(await fetchCalendarEvents());
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
  if (card) openMatch(card.dataset.id);
});

// =====================================================================
// MODALES GENÉRICOS (selección y partido)
// =====================================================================
const $teamModal = document.getElementById("teamModal");
const $teamContent = document.getElementById("teamContent");
const $matchModal = document.getElementById("matchModal");
const $matchContent = document.getElementById("matchContent");

function openModal($m) {
  $m.hidden = false;
  document.body.style.overflow = "hidden";
}
function closeModal($m) {
  $m.hidden = true;
  document.body.style.overflow = "";
}
[$teamModal, $matchModal].forEach(($m) => {
  $m.addEventListener("click", (e) => {
    if (e.target.hasAttribute("data-close")) closeModal($m);
  });
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!$teamModal.hidden) closeModal($teamModal);
  if (!$matchModal.hidden) closeModal($matchModal);
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
  const sq = await fifaApi(`teams/${id}/squad`, {
    idCompetition: FIFA_COMP,
    idSeason: FIFA_SEASON,
  });
  if (!sq || !(sq.Players || []).length) return null;
  return sq;
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
  return `
    <div class="player-card">
      ${foto
        ? `<img class="player-card__photo" src="${foto}" alt="" loading="lazy" onerror="this.outerHTML='<span class=\\'player-card__ph\\'>${(p.strPlayer || "?")[0]}</span>'" />`
        : `<span class="player-card__ph">${(p.strPlayer || "?")[0]}</span>`}
      <span class="player-card__name">${p.strPlayer || ""}</span>
      <span class="player-card__meta">${num ? `#${num}` : ""}${p.strTeam2 && p.strTeam2 !== p.strTeam ? ` · ${p.strTeam2}` : ""}</span>
    </div>`;
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
        <h2 class="tm-name">${localTeam ? localTeam.flag + " " : ""}${esName}</h2>
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

async function fetchMatch(id) {
  const [ev, lineup, timeline, stats] = await Promise.all([
    api("lookupevent.php", { id }).then((d) => (d.events || [])[0] || null).catch(() => null),
    api("lookuplineup.php", { id }).then((d) => d.lineup || []).catch(() => []),
    api("lookuptimeline.php", { id }).then((d) => d.timeline || []).catch(() => []),
    api("lookupeventstats.php", { id }).then((d) => d.eventstats || []).catch(() => []),
  ]);
  if (!ev) throw new Error("No se pudo cargar el detalle del partido.");

  // Detalle completo y gratuito desde la API de FIFA (alineaciones de 26,
  // táctica, técnico, árbitro y minuto a minuto en español). Si falla,
  // se usa lo de TheSportsDB como respaldo.
  let fifa = null;
  try {
    const fm = await findFifaMatch(ev);
    if (fm) {
      const [detail, events] = await Promise.all([
        fifaApi(`live/football/${FIFA_COMP}/${FIFA_SEASON}/${fm.stage}/${fm.id}`),
        fifaApi(`timelines/${FIFA_COMP}/${FIFA_SEASON}/${fm.stage}/${fm.id}`)
          .then((d) => d.Event || [])
          .catch(() => []),
      ]);
      if (detail && detail.HomeTeam) fifa = { detail, events };
    }
  } catch {}
  return { ev, lineup, timeline, stats, fifa };
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

function renderMatch(data) {
  const { ev, lineup, timeline, stats, fifa } = data;
  const fifaDetail = fifa && fifa.detail;
  const estado = matchState(ev);
  const d = matchDate(ev);
  const minuto = ev.strProgress ? `${ev.strProgress}'` : (fifaDetail && fifaDetail.MatchTime) || "";
  const centro =
    estado === "prog"
      ? `<span class="mm-time">${d ? fmtHoraLocal(d) : "vs"}</span>`
      : `<span class="mm-score">${ev.intHomeScore ?? "·"} - ${ev.intAwayScore ?? "·"}</span>`;
  const estadoTxt =
    estado === "live"
      ? `<span class="mc__live">● En vivo${minuto ? ` ${minuto}` : ""}</span>`
      : estado === "fin"
        ? `<span class="mc__ft">Final</span>`
        : d
          ? `<span class="mm-date">${fmtFechaLocal(d)}</span>`
          : "";

  // Metadatos: sede, ronda, asistencia y árbitro (FIFA).
  const arbitro = fifaDetail && (fifaDetail.Officials || []).find((o) => o.OfficialType === 1);
  const meta = [
    ev.strVenue ? `📍 ${ev.strVenue}` : "",
    ev.strRound ? `Jornada/ronda ${ev.strRound}` : "",
    ev.intSpectators ? `👥 ${Number(ev.intSpectators).toLocaleString("es")} espectadores` : "",
    arbitro ? `🟡 Árbitro: ${loc(arbitro.Name)}` : "",
  ].filter(Boolean).join(" · ");

  // Momentos: FIFA (completos y en español) o TheSportsDB como respaldo.
  const idHome = fifaDetail && fifaDetail.HomeTeam ? fifaDetail.HomeTeam.IdTeam : null;
  const fifaMomentos = ((fifa && fifa.events) || []).filter((t) => t.Type in FIFA_EV_ICON);
  const tsdbMomentos = timeline.filter((t) =>
    ["goal", "card", "subst", "var"].includes((t.strTimeline || "").toLowerCase())
  );
  const momentosHTML = fifaMomentos.length
    ? `<div class="tl-list">${fifaMomentos.map((t) => fifaMomentoRow(t, idHome)).join("")}</div>`
    : tsdbMomentos.length
      ? `<div class="tl-list">${tsdbMomentos
          .map(
            (t) => `<div class="tl-row ${t.strHome === "Yes" ? "is-home" : "is-away"}">
              <span class="tl-min">${t.intTime != null ? t.intTime + "'" : ""}</span>
              <span class="tl-ico">${timelineIcon(t)}</span>
              <span class="tl-txt"><b>${t.strPlayer || ""}</b>${t.strAssist ? ` (asist. ${t.strAssist})` : ""} · ${teamName(t.strTeam)}</span>
            </div>`
          )
          .join("")}</div>`
      : "";

  // Alineaciones: FIFA (26 jugadores, táctica, DT) o TheSportsDB como respaldo.
  const fifaTieneAlineacion =
    fifaDetail && ((fifaDetail.HomeTeam.Players || []).length || (fifaDetail.AwayTeam.Players || []).length);
  const alineacionesHTML = fifaTieneAlineacion
    ? `<div class="lu-grid">${fifaLineupCol(fifaDetail.HomeTeam)}${fifaLineupCol(fifaDetail.AwayTeam)}</div>`
    : lineup.length
      ? `<div class="lu-grid">
           ${lineupCol(lineup.filter((p) => p.strHome === "Yes"), teamName(ev.strHomeTeam))}
           ${lineupCol(lineup.filter((p) => p.strHome !== "Yes"), teamName(ev.strAwayTeam))}
         </div>`
      : `<p class="placeholder">Las alineaciones aún no se publican. Suelen aparecer cerca de la hora del partido.</p>`;

  $matchContent.innerHTML = `
    <div class="mm-head">
      <div class="mm-team">
        <img src="${ev.strHomeTeamBadge || ""}" alt="" />
        <span>${teamName(ev.strHomeTeam)}</span>
      </div>
      <div class="mm-center">${centro}${estadoTxt}</div>
      <div class="mm-team">
        <img src="${ev.strAwayTeamBadge || ""}" alt="" />
        <span>${teamName(ev.strAwayTeam)}</span>
      </div>
    </div>
    <div class="modal-pad">
      <p class="mm-meta">${meta}</p>

      ${momentosHTML ? `<h3 class="tm-sub">Momentos del partido</h3>${momentosHTML}` : ""}

      <h3 class="tm-sub">Alineaciones</h3>
      ${fifaTieneAlineacion ? fifaPitch(fifaDetail.HomeTeam, fifaDetail.AwayTeam) : ""}
      ${alineacionesHTML}

      ${(() => {
        const statsArr = stats.length ? stats : fifaStats(fifa && fifa.events, idHome);
        if (statsArr.length)
          return `<h3 class="tm-sub">Estadísticas</h3><div class="stats-list">${statsArr.map(statBar).join("")}</div>`;
        return estado !== "prog" ? `<p class="placeholder">Aún no hay estadísticas disponibles.</p>` : "";
      })()}
    </div>`;
}

const matchCache = {};

let matchReqId = 0;
async function openMatch(id) {
  const myReq = ++matchReqId;
  openModal($matchModal);
  $matchContent.innerHTML = spinnerHTML("Cargando partido...");
  try {
    // Los partidos en vivo no se cachean para ver siempre lo último.
    let data = matchCache[id];
    if (!data) {
      data = await fetchMatch(id);
      if (matchState(data.ev) === "fin") matchCache[id] = data;
    }
    if (myReq !== matchReqId) return; // se abrió otro partido después
    renderMatch(data);
  } catch (err) {
    if (myReq === matchReqId) $matchContent.innerHTML = modalError(err.message);
  }
}
