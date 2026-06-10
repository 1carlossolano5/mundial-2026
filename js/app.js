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
        <div class="group-row ${t.name === "Colombia" ? "is-you" : ""}">
          <img class="group-row__crest" src="${t.img}" alt="${t.name}" loading="lazy" />
          <span class="group-row__name">${t.name}</span>
        </div>`
        )
        .join("")}
    </div>`;
  }).join("");
}

// =====================================================================
// ESTADIOS
// =====================================================================
let estadiosCargados = false;
const $estadiosGrid = document.getElementById("estadiosGrid");

function loadStadiums() {
  estadiosCargados = true;
  $estadiosGrid.innerHTML = STADIUMS.map(
    (s) => `
    <article class="stadium-card">
      <div class="stadium-card__flag">${s.flag}</div>
      <h3 class="stadium-card__name">${s.name}</h3>
      <p class="stadium-card__city">${s.city} · ${s.country}</p>
      <p class="stadium-card__cap">≈ ${s.cap} asientos</p>
    </article>`
  ).join("");
}

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

function matchCard(e) {
  const jugado = e.intHomeScore != null && e.intAwayScore != null;
  const centro = jugado
    ? `<span class="mc__score">${e.intHomeScore} - ${e.intAwayScore}</span>`
    : `<span class="mc__time">${(e.strTime || "").slice(0, 5) || "vs"}</span>`;
  return `
    <div class="match-card ${jugado ? "is-played" : ""}">
      <div class="mc__team mc__home">
        <span>${e.strHomeTeam || ""}</span>
        <img src="${e.strHomeTeamBadge || ""}" alt="" loading="lazy" />
      </div>
      <div class="mc__center">${centro}${jugado ? `<span class="mc__ft">Final</span>` : ""}</div>
      <div class="mc__team mc__away">
        <img src="${e.strAwayTeamBadge || ""}" alt="" loading="lazy" />
        <span>${e.strAwayTeam || ""}</span>
      </div>
      ${e.strVenue ? `<div class="mc__venue">📍 ${e.strVenue}</div>` : ""}
    </div>`;
}

async function loadCalendar() {
  calendarioCargado = true;
  $calStatus.hidden = false;
  $calList.innerHTML = "";
  try {
    const data = await api("eventsseason.php", { id: WC_LEAGUE, s: SEASON });
    const events = (data.events || [])
      .slice()
      .sort((a, b) => (a.strTimestamp || "").localeCompare(b.strTimestamp || ""));
    $calStatus.hidden = true;
    if (!events.length) {
      $calList.innerHTML = `<p class="placeholder">Aún no hay partidos publicados por la API. Aparecerán a medida que se acerque y juegue el torneo.</p>`;
      return;
    }
    let html = "";
    let fechaActual = "";
    for (const e of events) {
      if (e.dateEvent !== fechaActual) {
        fechaActual = e.dateEvent;
        html += `<h3 class="cal-date">${fmtFecha(e.dateEvent)}</h3>`;
      }
      html += matchCard(e);
    }
    $calList.innerHTML = html;
  } catch (err) {
    $calStatus.hidden = true;
    $calList.innerHTML = `<p class="placeholder">${err.message}</p>`;
  }
}
