/* =====================================================================
   Mundial 2026 - Estadios: cuadricula y modal de detalle
   Parte de la logica antes en app.js. Script clasico (scope global);
   depende de data.js (cargar antes).
   ===================================================================== */
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
