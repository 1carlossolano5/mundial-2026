/* =====================================================================
   Mundial 2026 - Equipos: cuadricula de las 48 selecciones
   Parte de la logica antes en app.js. Script clasico (scope global);
   depende de data.js (cargar antes).
   ===================================================================== */
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
