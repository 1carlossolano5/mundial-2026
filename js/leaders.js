/* =====================================================================
   Mundial 2026 - Lideres: goleadores, asistidores y tarjetas
   Parte de la logica antes en app.js. Script clasico (scope global);
   depende de data.js (cargar antes).
   ===================================================================== */
// ---- Líderes: goleadores, asistidores y tarjetas ----
// (Calculados del minuto a minuto; FIFA no expone un endpoint útil de rankings.)
let goleadoresCargado = false;
let golTally = null; // tally cacheado para cambiar de pestaña sin recalcular
let golTab = "goles";
const golPlayerDir = {}; // IdPlayer → jugador del squad (para fotos en la tabla)
const $golList = document.getElementById("golList");
const $golStatus = document.getElementById("golStatus");
const $golTabs = document.getElementById("golTabs");
const $golFeature = document.getElementById("golFeature");
const golTimelineCache = {};

// Configuración de cada pestaña: columnas, valores, criterio de orden y ranking.
const GOL_TABS = [
  {
    id: "goles", label: "⚽ Goleadores", cols: ["G", "A"],
    val: (t) => [t.goles, t.asist], rankBy: (t) => t.goles,
    sort: (a, b) => b.goles - a.goles || b.asist - a.asist,
    vacio: "Todavía no hay goles registrados.",
  },
  {
    id: "asist", label: "🅰️ Asistidores", cols: ["A", "G"],
    val: (t) => [t.asist, t.goles], rankBy: (t) => t.asist,
    sort: (a, b) => b.asist - a.asist || b.goles - a.goles,
    vacio: "Todavía no hay asistencias registradas.",
  },
  {
    id: "tarjetas", label: "🟨 Tarjetas", cols: ["🟨", "🟥"],
    val: (t) => [t.amarillas, t.rojas], rankBy: (t) => t.amarillas + t.rojas * 2,
    sort: (a, b) => b.amarillas + b.rojas * 2 - (a.amarillas + a.rojas * 2) || b.rojas - a.rojas,
    vacio: "Todavía no hay tarjetas registradas.",
  },
];

function timelineForMatch(m) {
  if (!golTimelineCache[m.id]) {
    golTimelineCache[m.id] = fifaApi(`timelines/${FIFA_COMP}/${FIFA_SEASON}/${m.stage}/${m.id}`)
      .then((d) => d.Event || [])
      .catch(() => []);
  }
  return golTimelineCache[m.id];
}

// Tipo de evento FIFA → en qué contador suma (0 gol, 1 asist, 2 amarilla, 3 roja).
const GOL_EV = { 0: "goles", 1: "asist", 2: "amarillas", 3: "rojas" };

function renderGolTabs() {
  $golTabs.innerHTML = GOL_TABS.map(
    (t) => `<button class="gol-tab ${t.id === golTab ? "is-active" : ""}" data-tab="${t.id}" role="tab" aria-selected="${t.id === golTab}">${t.label}</button>`
  ).join("");
}

function renderGolTable(meta) {
  const cfg = GOL_TABS.find((t) => t.id === golTab);
  const rows = Object.values(golTally)
    .filter((t) => cfg.rankBy(t) > 0)
    .sort((a, b) => cfg.sort(a, b) || (a.name || "").localeCompare(b.name || ""))
    .slice(0, 25);

  if (!rows.length) {
    $golFeature.hidden = true;
    $golList.innerHTML = `<p class="placeholder">${cfg.vacio} La tabla se llenará a medida que se jueguen los partidos.</p>`;
    return;
  }
  renderGolFeature(rows[0], cfg, meta);
  let pos = 0;
  let prev = null;
  $golList.dataset.tab = golTab;
  $golList.innerHTML =
    `<div class="scorer-row scorer-row--head"><span>#</span><span></span><span>Jugador</span><span>${cfg.cols[0]}</span><span>${cfg.cols[1]}</span></div>` +
    rows
      .map((t, i) => {
        const r = cfg.rankBy(t);
        if (r !== prev) {
          pos = i + 1;
          prev = r;
        }
        const tm = meta[t.idTeam] || {};
        const [v1, v2] = cfg.val(t);
        const foto = golPlayerDir[t.idPlayer] && golPlayerDir[t.idPlayer].PlayerPicture
          ? golPlayerDir[t.idPlayer].PlayerPicture.PictureUrl
          : "";
        const ini = (t.name || "?")[0];
        const fotoHTML = foto
          ? `<img class="scorer-photo" src="${foto}" alt="" loading="lazy" onerror="this.outerHTML='<span class=\\'scorer-photo scorer-photo--ph\\'>${ini}</span>'" />`
          : `<span class="scorer-photo scorer-photo--ph">${ini}</span>`;
        const clic = t.idPlayer
          ? `<button class="scorer-row is-clickable" data-player="${t.idPlayer}" data-team="${t.idTeam || ""}" aria-label="Ver ficha de ${t.name || ""}">`
          : `<div class="scorer-row">`;
        const cierre = t.idPlayer ? `</button>` : `</div>`;
        return `${clic}
          <span class="scorer-pos">${pos}</span>
          ${fotoHTML}
          <span class="scorer-name">${t.name || "—"}<small>${tm.name || ""}</small></span>
          <span class="scorer-g">${v1}</span>
          <span class="scorer-a">${v2}</span>
        ${cierre}`;
      })
      .join("");
}

// Tarjeta destacada del líder (llena el espacio en pantallas anchas).
function renderGolFeature(top, cfg, meta) {
  const tm = meta[top.idTeam] || {};
  const foto = golPlayerDir[top.idPlayer] && golPlayerDir[top.idPlayer].PlayerPicture
    ? golPlayerDir[top.idPlayer].PlayerPicture.PictureUrl
    : "";
  const ini = (top.name || "?")[0];
  const [v1] = cfg.val(top);
  $golFeature.hidden = false;
  $golFeature.innerHTML = `
    <div class="feat-label">Líder · ${cfg.label.replace(/^\S+\s/, "")}</div>
    ${top.idPlayer ? `<button class="feat-card is-clickable" data-player="${top.idPlayer}" data-team="${top.idTeam || ""}" aria-label="Ver ficha de ${top.name || ""}">` : `<div class="feat-card">`}
      ${foto
        ? `<img class="feat-photo" src="${foto}" alt="" onerror="this.outerHTML='<span class=\\'feat-photo feat-photo--ph\\'>${ini}</span>'" />`
        : `<span class="feat-photo feat-photo--ph">${ini}</span>`}
      <span class="feat-stat">${v1}</span>
      <span class="feat-statlbl">${cfg.cols[0] === "G" ? "goles" : cfg.cols[0] === "A" ? "asistencias" : "tarjetas"}</span>
      <h3 class="feat-name">${top.name || "—"}</h3>
      <p class="feat-team">${tm.name || ""}</p>
    ${top.idPlayer ? `</button>` : `</div>`}`;
}

// Clic en una fila de la tabla o en la tarjeta destacada -> modal de jugador.
function golClickToPlayer(e) {
  const el = e.target.closest("[data-player]");
  if (el) openPlayer(el.dataset.player, el.dataset.team);
}
$golList.addEventListener("click", golClickToPlayer);
$golFeature.addEventListener("click", golClickToPlayer);

let golMeta = {};
async function loadScorers() {
  goleadoresCargado = true;
  renderGolTabs();
  $golStatus.hidden = false;
  $golList.innerHTML = "";
  try {
    const [cal, meta] = await Promise.all([fifaCalendar(), fifaTeamMeta()]);
    golMeta = meta;
    // Goles, tarjetas y faltas pueden darse en cualquier partido jugado.
    const jugados = cal.filter((m) => m.ts <= Date.now());
    const listas = await poolMap(jugados, 6, timelineForMatch);

    const tally = {}; // IdPlayer → { goles, asist, amarillas, rojas, name, idTeam, idPlayer }
    listas.forEach((events) => {
      (events || []).forEach((e) => {
        const campo = GOL_EV[e.Type];
        if (!campo) return;
        const key = e.IdPlayer || "d:" + loc(e.EventDescription);
        const t =
          tally[key] ||
          (tally[key] = { goles: 0, asist: 0, amarillas: 0, rojas: 0, name: playerFromDesc(loc(e.EventDescription)), idTeam: e.IdTeam, idPlayer: e.IdPlayer || null });
        t[campo]++;
        if (!t.name) t.name = playerFromDesc(loc(e.EventDescription));
      });
    });
    golTally = tally;

    $golStatus.hidden = true;
    renderGolTable(meta); // primero render rápido (sin fotos)

    // Luego trae las plantillas de los equipos involucrados para las fotos y
    // re-renderiza. Cacheadas y compartidas con el modal de selección/jugador.
    const teamsInvolved = [...new Set(Object.values(tally).map((t) => t.idTeam).filter(Boolean))];
    const squads = await poolMap(teamsInvolved, 6, fifaSquadById);
    squads.forEach((sq) => {
      if (sq) (sq.Players || []).forEach((p) => (golPlayerDir[p.IdPlayer] = p));
    });
    renderGolTable(meta); // re-render con fotos
  } catch (err) {
    $golStatus.hidden = true;
    goleadoresCargado = false; // permitir reintentar al volver a entrar
    $golList.innerHTML = `<p class="placeholder">${err.message}</p>`;
  }
}

// Cambio de pestaña: re-render instantáneo desde el tally ya calculado.
$golTabs.addEventListener("click", (e) => {
  const btn = e.target.closest(".gol-tab");
  if (!btn || btn.dataset.tab === golTab) return;
  golTab = btn.dataset.tab;
  renderGolTabs();
  if (golTally) renderGolTable(golMeta);
});
