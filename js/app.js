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
function fmtHoraLocal(d) {
  return d.toLocaleTimeString("es", { hour: "numeric", minute: "2-digit", hour12: true });
}

// Nombres de equipos en español si el navegador está en español; si no, se dejan
// como los entrega la API (depende del idioma de quien abre el link).
const APP_ES = (navigator.language || "es").toLowerCase().startsWith("es");
function teamName(x) {
  if (!x) return "";
  return APP_ES && typeof TEAM_ES !== "undefined" ? TEAM_ES[x] || x : x;
}
function fmtFechaLocal(d) {
  return d.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
}

function matchCard(e) {
  const jugado = e.intHomeScore != null && e.intAwayScore != null;
  const d = matchDate(e);
  const hora = d ? fmtHoraLocal(d) : (e.strTime || "").slice(0, 5) || "vs";
  const centro = jugado
    ? `<span class="mc__score">${e.intHomeScore} - ${e.intAwayScore}</span>`
    : `<span class="mc__time">${hora}</span>`;
  return `
    <div class="match-card ${jugado ? "is-played" : ""}">
      <div class="mc__team mc__home">
        <span>${teamName(e.strHomeTeam)}</span>
        <img src="${e.strHomeTeamBadge || ""}" alt="" loading="lazy" />
      </div>
      <div class="mc__center">${centro}${jugado ? `<span class="mc__ft">Final</span>` : ""}</div>
      <div class="mc__team mc__away">
        <img src="${e.strAwayTeamBadge || ""}" alt="" loading="lazy" />
        <span>${teamName(e.strAwayTeam)}</span>
      </div>
      ${e.strVenue ? `<div class="mc__venue">📍 ${e.strVenue}</div>` : ""}
    </div>`;
}

// Jornadas de grupos (1-3) + códigos de rondas de eliminatorias de TheSportsDB
// (125 Final, 126 Semis, 127 Cuartos, 128 Octavos/16avos, 129 32avos).
const CAL_ROUNDS = [1, 2, 3, 129, 128, 127, 126, 125];

async function loadCalendar() {
  calendarioCargado = true;
  $calStatus.hidden = false;
  $calList.innerHTML = "";
  try {
    // Pedimos todas las jornadas/rondas en paralelo y las combinamos.
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
    $calStatus.hidden = true;
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
  } catch (err) {
    $calStatus.hidden = true;
    $calList.innerHTML = `<p class="placeholder">${err.message}</p>`;
  }
}
