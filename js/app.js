/* =====================================================================
   Mundial 2026 — Lógica base
   ===================================================================== */

// Liga 1 = Copa Mundial de la FIFA en API-Football.
const LEAGUE = 1;
const SEASON = 2026;
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

async function loadGroups() {
  $gruposStatus.hidden = false;
  $gruposGrid.innerHTML = "";
  try {
    const data = await api("standings", { league: LEAGUE, season: SEASON });
    const standings = data.response?.[0]?.league?.standings || [];
    $gruposStatus.hidden = true;

    if (!standings.length) {
      $gruposGrid.innerHTML = `<p class="placeholder">Aún no hay tabla de grupos disponible para la temporada ${SEASON}. Aparecerá cuando la API la publique.</p>`;
      return;
    }

    gruposCargados = true;
    $gruposGrid.innerHTML = standings
      .map((grupo) => {
        const nombre = grupo[0]?.group || "Grupo";
        const filas = grupo
          .map(
            (t) => `
            <div class="group-row">
              <span class="group-row__rank">${t.rank}</span>
              <img src="${t.team.logo}" alt="${t.team.name}" loading="lazy" />
              <span>${t.team.name}</span>
              <span class="group-row__pts">${t.points}</span>
            </div>`
          )
          .join("");
        return `<div class="group-card">
          <div class="group-card__head">${nombre}</div>
          ${filas}
        </div>`;
      })
      .join("");
  } catch (err) {
    $gruposStatus.hidden = true;
    $gruposGrid.innerHTML = `<p class="placeholder">${err.message}</p>`;
  }
}
