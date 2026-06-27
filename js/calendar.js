/* =====================================================================
   Mundial 2026 - Calendario: partidos, resultados en vivo y refresco automatico
   Parte de la logica antes en app.js. Script clasico (scope global);
   depende de data.js (cargar antes).
   ===================================================================== */
// =====================================================================
// CALENDARIO (partidos + resultados en vivo, desde TheSportsDB)
// =====================================================================
let calendarioCargado = false;
const $calList = document.getElementById("calList");
const $calStatus = document.getElementById("calStatus");

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
