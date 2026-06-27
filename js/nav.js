/* =====================================================================
   Mundial 2026 - Navegacion entre vistas, cuenta regresiva y ticker de banderas
   Parte de la logica antes en app.js. Script clasico (scope global);
   depende de data.js (cargar antes).
   ===================================================================== */
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
