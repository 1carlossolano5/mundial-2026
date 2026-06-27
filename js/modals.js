/* =====================================================================
   Mundial 2026 - Modales genericos: abrir/cerrar, overlay y tecla Escape
   Parte de la logica antes en app.js. Script clasico (scope global);
   depende de data.js (cargar antes).
   ===================================================================== */
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
