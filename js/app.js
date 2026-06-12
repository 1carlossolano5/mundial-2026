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
async function api(path, params = {}) {
  const url = new URL("/api/football", window.location.origin);
  url.searchParams.set("path", path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
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

// ---- Grupos ----
let gruposCargados = false;
const $gruposGrid = document.getElementById("gruposGrid");
const $gruposStatus = document.getElementById("gruposStatus");

function loadGroups() {
  gruposCargados = true;
  $gruposStatus.hidden = true;
  $gruposGrid.innerHTML = GROUPS.map((g) => {
    const tuyo = g.teams.some((t) => t.name === "Colombia");
    return `
    <div class="group-card ${tuyo ? "is-highlight" : ""}">
      <div class="group-card__head">
        <span>Grupo ${g.letter}</span>
        ${tuyo ? `<span class="group-card__badge">🇨🇴 Tu selección</span>` : ""}
      </div>
      ${g.teams
        .map(
          (t) => `
        <button class="group-row ${t.name === "Colombia" ? "is-you" : ""}" data-team="${t.name}" aria-label="Ver jugadores y datos de ${t.name}">
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

async function fetchTeam(esName) {
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
  const { team, players, last } = data;
  const localTeam = GROUPS.flatMap((g) => g.teams).find((t) => t.name === esName);
  const crest = team.strBadge || (localTeam ? localTeam.img : "");
  const coach = players.find((p) => posGroup(p.strPosition) === "dt");
  const coachName = (coach && coach.strPlayer) || team.strManager || "";
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

async function openTeam(esName) {
  openModal($teamModal);
  $teamContent.innerHTML = spinnerHTML(`Cargando ${esName}...`);
  try {
    const data = teamCache[esName] || (teamCache[esName] = fetchTeam(esName));
    renderTeam(esName, await data);
  } catch (err) {
    delete teamCache[esName];
    $teamContent.innerHTML = modalError(err.message);
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
  return { ev, lineup, timeline, stats };
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
  const { ev, lineup, timeline, stats } = data;
  const estado = matchState(ev);
  const d = matchDate(ev);
  const centro =
    estado === "prog"
      ? `<span class="mm-time">${d ? fmtHoraLocal(d) : "vs"}</span>`
      : `<span class="mm-score">${ev.intHomeScore ?? "·"} - ${ev.intAwayScore ?? "·"}</span>`;
  const estadoTxt =
    estado === "live"
      ? `<span class="mc__live">● En vivo${ev.strProgress ? ` ${ev.strProgress}'` : ""}</span>`
      : estado === "fin"
        ? `<span class="mc__ft">Final</span>`
        : d
          ? `<span class="mm-date">${fmtFechaLocal(d)}</span>`
          : "";

  const titularesH = lineup.filter((p) => p.strHome === "Yes" && p.strSubstitute !== "Yes");
  const titularesA = lineup.filter((p) => p.strHome !== "Yes" && p.strSubstitute !== "Yes");
  const momentos = timeline.filter((t) =>
    ["goal", "card", "subst", "var"].includes((t.strTimeline || "").toLowerCase())
  );

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
      <p class="mm-meta">${[ev.strVenue ? `📍 ${ev.strVenue}` : "", ev.strRound ? `Jornada/ronda ${ev.strRound}` : "", ev.intSpectators ? `👥 ${Number(ev.intSpectators).toLocaleString("es")} espectadores` : ""].filter(Boolean).join(" · ")}</p>

      ${momentos.length
        ? `<h3 class="tm-sub">Momentos del partido</h3>
           <div class="tl-list">${momentos
             .map(
               (t) => `<div class="tl-row ${t.strHome === "Yes" ? "is-home" : "is-away"}">
                 <span class="tl-min">${t.intTime != null ? t.intTime + "'" : ""}</span>
                 <span class="tl-ico">${timelineIcon(t)}</span>
                 <span class="tl-txt"><b>${t.strPlayer || ""}</b>${t.strAssist ? ` (asist. ${t.strAssist})` : ""} · ${teamName(t.strTeam)}</span>
               </div>`
             )
             .join("")}</div>`
        : ""}

      <h3 class="tm-sub">Alineaciones</h3>
      ${titularesH.length || titularesA.length
        ? `<div class="lu-grid">
             ${lineupCol(lineup.filter((p) => p.strHome === "Yes"), teamName(ev.strHomeTeam))}
             ${lineupCol(lineup.filter((p) => p.strHome !== "Yes"), teamName(ev.strAwayTeam))}
           </div>`
        : `<p class="placeholder">La API aún no publica las alineaciones de este partido. Suelen aparecer cerca de la hora del partido.</p>`}

      ${stats.length
        ? `<h3 class="tm-sub">Estadísticas</h3><div class="stats-list">${stats.map(statBar).join("")}</div>`
        : estado !== "prog"
          ? `<p class="placeholder">Aún no hay estadísticas disponibles.</p>`
          : ""}
    </div>`;
}

const matchCache = {};

async function openMatch(id) {
  openModal($matchModal);
  $matchContent.innerHTML = spinnerHTML("Cargando partido...");
  try {
    // Los partidos en vivo no se cachean para ver siempre lo último.
    let data = matchCache[id];
    if (!data) {
      data = await fetchMatch(id);
      if (matchState(data.ev) === "fin") matchCache[id] = data;
    }
    renderMatch(data);
  } catch (err) {
    $matchContent.innerHTML = modalError(err.message);
  }
}
