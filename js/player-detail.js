/* =====================================================================
   Mundial 2026 - Detalle de jugador: foto y datos
   Parte de la logica antes en app.js. Script clasico (scope global);
   depende de data.js (cargar antes).
   ===================================================================== */
// =====================================================================
// DETALLE DE JUGADOR (foto grande + datos)
// =====================================================================
const PIE_ES = { 1: "Derecho", 2: "Izquierdo", 3: "Ambos" };
const playerByIdCache = {};
function fifaPlayer(idPlayer) {
  if (!playerByIdCache[idPlayer]) {
    playerByIdCache[idPlayer] = fifaApi(`players/${idPlayer}`).catch(() => null);
  }
  return playerByIdCache[idPlayer];
}

function edad(birth) {
  if (!birth) return null;
  const ms = Date.now() - new Date(birth).getTime();
  const a = Math.floor(ms / 31557600000);
  return a > 0 && a < 60 ? a : null;
}

let playerReqId = 0;
async function openPlayer(idPlayer, idTeam) {
  if (!idPlayer) return;
  const myReq = ++playerReqId;
  openModal($playerModal);
  $playerContent.innerHTML = spinnerHTML("Cargando jugador...");
  try {
    const [squad, info, meta] = await Promise.all([
      idTeam ? fifaSquadById(idTeam) : Promise.resolve(null),
      fifaPlayer(idPlayer),
      fifaTeamMeta().catch(() => ({})),
    ]);
    if (myReq !== playerReqId) return;
    const sp = squad && (squad.Players || []).find((p) => p.IdPlayer === idPlayer);
    if (!sp && !info) {
      $playerContent.innerHTML = modalError("No se encontraron datos de este jugador.");
      return;
    }
    renderPlayer({ sp, info, idPlayer, tm: (meta && meta[idTeam]) || {} });
  } catch (err) {
    if (myReq === playerReqId) $playerContent.innerHTML = modalError(err.message);
  }
}

function renderPlayer({ sp, info, idPlayer, tm }) {
  const nombre = (sp && loc(sp.PlayerName)) || (info && loc(info.Name)) || "Jugador";
  const foto = (sp && sp.PlayerPicture && sp.PlayerPicture.PictureUrl) || "";
  tm = tm || {};
  const posLabel = sp ? loc(sp.PositionLocalized) : "";
  const num = sp && sp.JerseyNum != null ? sp.JerseyNum : null;
  const aniosNac = info && info.BirthDate ? new Date(info.BirthDate).getFullYear() : (sp && sp.BirthDate ? new Date(sp.BirthDate).getFullYear() : null);
  const a = edad((info && info.BirthDate) || (sp && sp.BirthDate));
  const altura = (sp && sp.Height) || (info && info.Height);
  const peso = (sp && sp.Weight) || (info && info.Weight);
  const pie = info && PIE_ES[info.PreferredFoot];
  const caps = info && info.InternationalCaps;
  const golesCarrera = info && info.Goals;
  const torneo = (golTally && golTally[idPlayer]) || null;

  const dato = (label, val) => (val || val === 0 ? `<div class="pl-dato"><span>${label}</span><b>${val}</b></div>` : "");

  $playerContent.innerHTML = `
    <div class="pl-head">
      ${foto
        ? `<img class="pl-photo" src="${foto}" alt="" onerror="this.outerHTML='<span class=\\'pl-photo pl-photo--ph\\'>${(nombre[0] || "?")}</span>'" />`
        : `<span class="pl-photo pl-photo--ph">${nombre[0] || "?"}</span>`}
      <div class="pl-headinfo">
        ${num != null ? `<span class="pl-num">#${num}</span>` : ""}
        <h2 class="pl-name">${nombre}</h2>
        <p class="pl-team">${tm.name || ""}${posLabel ? ` · ${posLabel}` : ""}</p>
      </div>
    </div>
    <div class="modal-pad">
      <div class="pl-grid">
        ${dato("Edad", a ? `${a} años` : "")}
        ${dato("Nacimiento", aniosNac)}
        ${dato("Estatura", altura ? `${Math.round(altura)} cm` : "")}
        ${dato("Peso", peso ? `${Math.round(peso)} kg` : "")}
        ${dato("Pie hábil", pie)}
        ${dato("Partidos internac.", caps)}
        ${dato("Goles (selección)", golesCarrera)}
      </div>
      ${torneo
        ? `<h3 class="tm-sub">En el Mundial 2026</h3>
           <div class="pl-tourney">
             <div class="pl-stat"><b>${torneo.goles}</b><span>⚽ Goles</span></div>
             <div class="pl-stat"><b>${torneo.asist}</b><span>🅰️ Asist.</span></div>
             <div class="pl-stat"><b>${torneo.amarillas}</b><span>🟨 Amar.</span></div>
             <div class="pl-stat"><b>${torneo.rojas}</b><span>🟥 Rojas</span></div>
           </div>`
        : ""}
    </div>`;
}
