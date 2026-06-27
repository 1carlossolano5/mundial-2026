/* =====================================================================
   Mundial 2026 - Detalle de seleccion: plantel, tecnico y ultimos partidos
   Parte de la logica antes en app.js. Script clasico (scope global);
   depende de data.js (cargar antes).
   ===================================================================== */
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

// Plantel completo (lista de 26 convocados) desde la API de FIFA. El endpoint
// /teams/{id}/squad existe para TODAS las selecciones, hayan jugado o no:
// número, posición y técnico siempre; las fotos aparecen cuando el equipo
// debuta. Devuelve null si no se halla el equipo.
async function fifaSquad(esName) {
  const id = await fifaTeamId(esName);
  if (!id) return null;
  return fifaSquadById(id);
}

async function fetchTeamTSDB(esName) {
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

async function fetchTeam(esName) {
  const [tsdb, squad] = await Promise.all([
    fetchTeamTSDB(esName).catch(() => null),
    fifaSquad(esName).catch(() => null),
  ]);
  if (!tsdb && !squad) throw new Error("No se encontraron datos de esta selección.");
  return { tsdb, squad };
}

function playerCard(p) {
  const foto = p.strCutout || p.strThumb || "";
  const num = p.strNumber && p.strNumber !== "0" ? p.strNumber : "";
  // Si tiene IdPlayer (datos FIFA) la tarjeta es un botón que abre el modal jugador.
  const clic = p.idPlayer
    ? `<button class="player-card is-clickable" data-player="${p.idPlayer}" data-team="${p.idTeam || ""}" aria-label="Ver ficha de ${p.strPlayer || ""}">`
    : `<div class="player-card">`;
  const cierre = p.idPlayer ? `</button>` : `</div>`;
  return `
    ${clic}
      ${foto
        ? `<img class="player-card__photo" src="${foto}" alt="" loading="lazy" onerror="this.outerHTML='<span class=\\'player-card__ph\\'>${(p.strPlayer || "?")[0]}</span>'" />`
        : `<span class="player-card__ph">${(p.strPlayer || "?")[0]}</span>`}
      <span class="player-card__name">${p.strPlayer || ""}</span>
      <span class="player-card__meta">${num ? `#${num}` : ""}${p.strTeam2 && p.strTeam2 !== p.strTeam ? ` · ${p.strTeam2}` : ""}</span>
    ${cierre}`;
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
  const { tsdb, squad } = data;
  const team = (tsdb && tsdb.team) || {};
  const last = (tsdb && tsdb.last) || [];
  const localTeam = GROUPS.flatMap((g) => g.teams).find((t) => t.name === esName);
  const crest = team.strBadge || (localTeam ? localTeam.img : "");

  // Jugadores: plantel FIFA completo (26) si existe; si no, lo de TheSportsDB.
  // El endpoint squad usa Position 0-3 = arquero/defensa/medio/delantero.
  const FIFA_POS = ["Goalkeeper", "Defender", "Midfield", "Forward"];
  const players = squad
    ? (squad.Players || []).map((p) => ({
        strPlayer: loc(p.PlayerName),
        strCutout: (p.PlayerPicture && p.PlayerPicture.PictureUrl) || "",
        strNumber: p.JerseyNum != null ? String(p.JerseyNum) : "",
        strPosition: FIFA_POS[p.Position] || "",
        strTeam: esName,
        idPlayer: p.IdPlayer,
        idTeam: squad.IdTeam,
      }))
    : (tsdb && tsdb.players) || [];

  // En el endpoint squad, el técnico (DT) es el oficial con Role === 0.
  const fifaCoach =
    squad && (squad.Officials || []).find((c) => c.Role === 0);
  const coach = players.find((p) => posGroup(p.strPosition) === "dt");
  const coachName =
    (fifaCoach && loc(fifaCoach.Name)) || (coach && coach.strPlayer) || team.strManager || "";
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
        <h2 class="tm-name">${esName}</h2>
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

// Token para que, si se abren varias selecciones seguidas, solo la última
// escriba en el modal (evita que una petición lenta pise a la más reciente).
let teamReqId = 0;
async function openTeam(esName) {
  const myReq = ++teamReqId;
  openModal($teamModal);
  $teamContent.innerHTML = spinnerHTML(`Cargando ${esName}...`);
  try {
    const data = teamCache[esName] || (teamCache[esName] = fetchTeam(esName));
    const resolved = await data;
    if (myReq !== teamReqId) return; // llegó otra apertura después: se ignora
    renderTeam(esName, resolved);
  } catch (err) {
    delete teamCache[esName];
    if (myReq === teamReqId) $teamContent.innerHTML = modalError(err.message);
  }
}

// Clic en una tarjeta de jugador (dentro del modal de selección) -> modal jugador.
$teamContent.addEventListener("click", (e) => {
  const card = e.target.closest(".player-card[data-player]");
  if (card) openPlayer(card.dataset.player, card.dataset.team);
});
