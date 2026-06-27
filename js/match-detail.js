/* =====================================================================
   Mundial 2026 - Detalle de partido: alineaciones, momentos, estadisticas y donde ver
   Parte de la logica antes en app.js. Script clasico (scope global);
   depende de data.js (cargar antes).
   ===================================================================== */
// =====================================================================
// DETALLE DE PARTIDO (alineaciones, goles/momentos, estadísticas)
// =====================================================================
const STAT_ES = {
  "Ball Possession": "Posesión",
  "Total Shots": "Remates",
  "Shots on Goal": "Remates al arco",
  "Shots off Goal": "Remates desviados",
  "Blocked Shots": "Remates bloqueados",
  "Corner Kicks": "Tiros de esquina",
  Fouls: "Faltas",
  Offsides: "Fueras de juego",
  "Yellow Cards": "Tarjetas amarillas",
  "Red Cards": "Tarjetas rojas",
  "Goalkeeper Saves": "Atajadas",
  "Shots insidebox": "Remates en el área",
  "Shots outsidebox": "Remates fuera del área",
  "Total passes": "Pases totales",
  "Passes accurate": "Pases acertados",
  "Passes %": "Precisión de pases",
};

function timelineIcon(t) {
  const det = (t.strTimelineDetail || "").toLowerCase();
  const tipo = (t.strTimeline || "").toLowerCase();
  if (tipo === "goal") return det.includes("penalty") ? "⚽ (pen)" : det.includes("own") ? "⚽ (e.c.)" : "⚽";
  if (tipo === "card") return det.includes("red") ? "🟥" : "🟨";
  if (tipo === "subst") return "🔁";
  if (tipo === "var") return "📺 VAR";
  return "•";
}

// Detalle del partido directo desde FIFA por stage+id (sin cruces difusos):
// alineaciones de 26, táctica, técnico, árbitro y minuto a minuto en español.
async function fetchMatch(stage, id) {
  const [detailRaw, events, cal] = await Promise.all([
    fifaApi(`live/football/${FIFA_COMP}/${FIFA_SEASON}/${stage}/${id}`).catch(() => null),
    fifaApi(`timelines/${FIFA_COMP}/${FIFA_SEASON}/${stage}/${id}`).then((d) => d.Event || []).catch(() => []),
    fifaCalendar().catch(() => []),
  ]);
  const calMatch = (cal || []).find((c) => String(c.id) === String(id)) || null;
  let detail = detailRaw;
  // Eliminatorias aún sin equipos: FIFA devuelve null. Armamos un detalle
  // mínimo desde el calendario para mostrar sede, ronda y dónde ver.
  if (!detail || !detail.HomeTeam) {
    if (!calMatch) throw new Error("No se pudo cargar el detalle del partido.");
    const tn = (s) => [{ Description: s || "" }];
    const lado = (nombre, idT) => ({ TeamName: tn(nombre), IdTeam: idT, Players: [], Score: null, Tactics: "", Coaches: [] });
    detail = {
      MatchStatus: calMatch.status,
      MatchTime: "",
      Date: calMatch.ts ? new Date(calMatch.ts).toISOString() : null,
      StageName: tn(calMatch.stageName),
      GroupName: tn(calMatch.group),
      Stadium: { Name: tn(calMatch.venue) },
      Officials: [],
      HomeTeam: lado(calMatch.home, calMatch.homeId),
      AwayTeam: lado(calMatch.away, calMatch.awayId),
    };
  }
  return { detail, events, standings: computeGroupStandings(cal || []), calMatch };
}

// Fila de la tabla de un equipo (en cualquier grupo).
function teamStandRow(standings, idTeam) {
  for (const gn in standings) {
    const r = standings[gn].find((x) => x.id === idTeam);
    if (r) return r;
  }
  return null;
}
// Pronóstico simple (no son cuotas): a partir del rendimiento en el torneo.
function matchOdds(idHome, idAway, standings) {
  const H = teamStandRow(standings, idHome), A = teamStandRow(standings, idAway);
  if (!H || !A || !H.pj || !A.pj) return null; // hace falta que ambos hayan jugado
  const fuerza = (r) => r.pts / r.pj + (r.dg / r.pj) * 0.35;
  const diff = Math.max(-2, Math.min(2, fuerza(H) - fuerza(A))); // acotar extremos
  const eH = Math.exp(0.7 * diff), eA = Math.exp(-0.7 * diff);
  const empate = 0.3 / (1 + Math.abs(diff) * 0.6);
  const pH = (eH / (eH + eA)) * (1 - empate);
  const pA = (eA / (eH + eA)) * (1 - empate);
  const tot = pH + pA + empate;
  const h = Math.round((pH / tot) * 100);
  const a = Math.round((pA / tot) * 100);
  return { h, a, e: 100 - h - a };
}

function lineupCol(lista, titulo) {
  if (!lista.length) return "";
  return `
    <div class="lu-col">
      <h4>${titulo}</h4>
      ${lista
        .map(
          (p) => `<div class="lu-row">
            <span class="lu-num">${p.intSquadNumber || ""}</span>
            <span class="lu-name">${p.strPlayer || ""}</span>
            ${p.strSubstitute === "Yes" ? `<span class="lu-sub">supl.</span>` : ""}
          </div>`
        )
        .join("")}
    </div>`;
}

// Columna de alineación con datos FIFA (titulares, banca, táctica y DT).
function fifaLineupCol(team) {
  const tit = (team.Players || []).filter((p) => p.Status === 1);
  const sup = (team.Players || []).filter((p) => p.Status !== 1);
  const coach = (team.Coaches || []).find((c) => c.Role === 1) || (team.Coaches || [])[0];
  const row = (p) => `<div class="lu-row">
      <span class="lu-num">${p.ShirtNumber ?? ""}</span>
      <span class="lu-name">${loc(p.PlayerName)}${p.Captain ? " <b>(C)</b>" : ""}</span>
    </div>`;
  return `<div class="lu-col">
    <h4>${loc(team.TeamName)}${team.Tactics ? ` · ${team.Tactics}` : ""}</h4>
    ${coach ? `<p class="lu-dt">DT: <b>${loc(coach.Name)}</b></p>` : ""}
    ${tit.map(row).join("")}
    ${sup.length ? `<p class="lu-banca">Banca</p>${sup.map(row).join("")}` : ""}
  </div>`;
}


// Momentos con datos FIFA (descripciones ya en español).
const FIFA_EV_ICON = { 0: "⚽", 2: "🟨", 3: "🟥", 5: "🔁", 71: "📺" };

// Estadísticas contadas desde el minuto a minuto de FIFA (útil sobre todo
// en vivo, cuando TheSportsDB todavía no publica las suyas).
const FIFA_STAT_TYPES = [
  [12, "Remates a puerta"],
  [57, "Atajadas"],
  [16, "Tiros de esquina"],
  [18, "Faltas"],
  [15, "Fueras de juego"],
  [2, "Tarjetas amarillas"],
  [3, "Tarjetas rojas"],
];
function fifaStats(events, idHome) {
  if (!events || !events.length || !idHome) return [];
  return FIFA_STAT_TYPES.map(([type, label]) => {
    const delTipo = events.filter((t) => t.Type === type);
    if (!delTipo.length) return null;
    const h = delTipo.filter((t) => t.IdTeam === idHome).length;
    return { strStat: label, intHome: h, intAway: delTipo.length - h };
  }).filter(Boolean);
}
function fifaMomentoRow(t, idHome) {
  const desc = loc(t.EventDescription) || loc(t.TypeLocalized);
  return `<div class="tl-row ${t.IdTeam === idHome ? "is-home" : "is-away"}">
    <span class="tl-min">${t.MatchMinute || ""}</span>
    <span class="tl-ico">${FIFA_EV_ICON[t.Type] || "•"}</span>
    <span class="tl-txt">${desc}${t.Type === 0 ? ` <b>(${t.HomeGoals}-${t.AwayGoals})</b>` : ""}</span>
  </div>`;
}

function statBar(s) {
  const h = Number(s.intHome) || 0;
  const a = Number(s.intAway) || 0;
  const total = h + a || 1;
  return `
    <div class="stat-row">
      <span class="stat-row__v">${s.intHome ?? 0}</span>
      <div class="stat-row__mid">
        <span class="stat-row__label">${STAT_ES[s.strStat] || s.strStat}</span>
        <div class="stat-row__bar">
          <span style="width:${(h / total) * 100}%"></span><span style="width:${(a / total) * 100}%"></span>
        </div>
      </div>
      <span class="stat-row__v">${s.intAway ?? 0}</span>
    </div>`;
}

// Partidos por señal abierta (Caracol/RCN). Lista oficial de fase de grupos +
// los de Colombia (detectados aparte) + semifinales y final (por StageName).
// Clave por par de nombres (sin orden, sin acentos). Agregar aquí los demás
// que confirmen los canales (p. ej. los de eliminatorias cuando se sepan).
const tvPairKey = (a, b) => [normTxt(a), normTxt(b)].sort().join("|");
const FREE_TO_AIR_PAIRS = new Set([
  tvPairKey("México", "Sudáfrica"),
  tvPairKey("Estados Unidos", "Paraguay"),
  tvPairKey("Brasil", "Marruecos"),
  tvPairKey("Países Bajos", "Japón"),
  tvPairKey("España", "Cabo Verde"),
  tvPairKey("Argentina", "Argelia"),
  tvPairKey("Uzbekistán", "Colombia"),
  tvPairKey("Suiza", "Bosnia y Herzegovina"),
  tvPairKey("Escocia", "Marruecos"),
  tvPairKey("Alemania", "Costa de Marfil"),
  tvPairKey("Bélgica", "Irán"),
  tvPairKey("Argentina", "Austria"),
  tvPairKey("Colombia", "R.D. Congo"),
  tvPairKey("Escocia", "Brasil"),
  tvPairKey("Ecuador", "Alemania"),
  tvPairKey("Uruguay", "España"),
  tvPairKey("Colombia", "Portugal"),
]);
// Rondas finales que Caracol/RCN pasan completas por señal abierta.
const FREE_TO_AIR_STAGES = /^(Semifinal|Final)$/i;

// Partidos que transmite Disney+ (ESPN) en Colombia: 22 de grupos (lista ESPN)
// + los de Colombia + semifinales y final. Eliminatorias específicas: pendientes.
const DISNEY_PAIRS = new Set([
  tvPairKey("México", "Sudáfrica"),
  tvPairKey("Canadá", "Bosnia y Herzegovina"),
  tvPairKey("Estados Unidos", "Paraguay"),
  tvPairKey("Brasil", "Marruecos"),
  tvPairKey("Países Bajos", "Japón"),
  tvPairKey("Costa de Marfil", "Ecuador"),
  tvPairKey("España", "Cabo Verde"),
  tvPairKey("Arabia Saudita", "Uruguay"),
  tvPairKey("Argentina", "Argelia"),
  tvPairKey("Uzbekistán", "Colombia"),
  tvPairKey("Suiza", "Bosnia y Herzegovina"),
  tvPairKey("Alemania", "Costa de Marfil"),
  tvPairKey("Ecuador", "Curazao"),
  tvPairKey("España", "Arabia Saudita"),
  tvPairKey("Bélgica", "Irán"),
  tvPairKey("Argentina", "Austria"),
  tvPairKey("Colombia", "R.D. Congo"),
  tvPairKey("Brasil", "Escocia"),
  tvPairKey("Ecuador", "Alemania"),
  tvPairKey("Noruega", "Francia"),
  tvPairKey("Uruguay", "España"),
  tvPairKey("Colombia", "Portugal"),
  tvPairKey("Jordania", "Argentina"),
]);

function renderMatch(data) {
  const { detail, events, standings, calMatch } = data;
  const home = detail.HomeTeam, away = detail.AwayTeam;
  const th = groupTeamForFifa(loc(home.TeamName)), ta = groupTeamForFifa(loc(away.TeamName));
  const nh = th ? th.name : loc(home.TeamName) || "Por definir";
  const na = ta ? ta.name : loc(away.TeamName) || "Por definir";
  const ch = th ? th.img : "", ca = ta ? ta.img : "";
  const stageName = (calMatch && calMatch.stageName) || loc(detail.StageName);
  const idHome = home.IdTeam;
  const estado = fifaState(detail.MatchStatus);
  const d = new Date(detail.Date);
  const minuto = detail.MatchTime || "";
  const centro =
    estado === "prog"
      ? `<span class="mm-time">${isNaN(d.getTime()) ? "vs" : fmtHoraLocal(d)}</span>`
      : `<span class="mm-score">${home.Score ?? "·"} - ${away.Score ?? "·"}</span>`;
  const estadoTxt =
    estado === "live"
      ? `<span class="mc__live">● En vivo${minuto ? " " + minuto : ""}</span>`
      : estado === "fin"
        ? `<span class="mc__ft">Final</span>`
        : !isNaN(d.getTime())
          ? `<span class="mm-date">${fmtFechaLocal(d)}</span>`
          : "";

  const arbitro = (detail.Officials || []).find((o) => o.OfficialType === 1);
  const venue = loc(detail.Stadium && detail.Stadium.Name);
  const meta = [
    venue ? `📍 ${venue}` : "",
    loc(detail.GroupName) || stageName,
    detail.Attendance ? `👥 ${Number(detail.Attendance).toLocaleString("es")}` : "",
    arbitro ? `🟡 ${loc(arbitro.Name)}` : "",
  ].filter(Boolean).join(" · ");

  const momentos = (events || []).filter((t) => t.Type in FIFA_EV_ICON);
  const momentosHTML = momentos.length
    ? `<h3 class="tm-sub">Momentos del partido</h3><div class="tl-list">${momentos.map((t) => fifaMomentoRow(t, idHome)).join("")}</div>`
    : "";

  const tieneAlin = (home.Players || []).length || (away.Players || []).length;
  const alinHTML = tieneAlin
    ? `<h3 class="tm-sub">Alineaciones</h3>${fifaPitch(home, away)}<div class="lu-grid">${fifaLineupCol(home)}${fifaLineupCol(away)}</div>`
    : `<h3 class="tm-sub">Alineaciones</h3><p class="placeholder">Las alineaciones aparecen cerca de la hora del partido.</p>`;

  const statsArr = fifaStats(events, idHome);
  const statsHTML = statsArr.length
    ? `<h3 class="tm-sub">Estadísticas</h3><div class="stats-list">${statsArr.map(statBar).join("")}</div>`
    : "";

  // Pronóstico solo para partidos por jugar (en vivo/terminado ya se ve el marcador).
  const odds = estado === "prog" ? matchOdds(idHome, away.IdTeam, standings) : null;
  const oddsHTML = odds
    ? `<h3 class="tm-sub">Pronóstico</h3>
       <div class="odds">
         <div class="odds-bar"><span class="odds-h" style="width:${odds.h}%"></span><span class="odds-e" style="width:${odds.e}%"></span><span class="odds-a" style="width:${odds.a}%"></span></div>
         <div class="odds-legend"><span><b>${odds.h}%</b> ${nh}</span><span><b>${odds.e}%</b> Empate</span><span><b>${odds.a}%</b> ${na}</span></div>
         <p class="odds-note">Estimación según el rendimiento en el torneo · no son cuotas reales.</p>
       </div>`
    : "";

  // Dónde ver (Colombia). DSports/DGO + Paramount+ tienen los 104; Caracol/RCN
  // (señal abierta gratis) y Disney+ solo en partidos confirmados.
  const pareja = tvPairKey(nh, na);
  const hayCol = [nh, na].includes("Colombia");
  const finales = FREE_TO_AIR_STAGES.test(stageName);
  const senalAbierta = hayCol || finales || FREE_TO_AIR_PAIRS.has(pareja);
  const disney = hayCol || finales || DISNEY_PAIRS.has(pareja);
  const pagos = ["DSports/DGO", "Paramount+"].concat(disney ? ["Disney+"] : []).join(", ");
  const verHTML = `<h3 class="tm-sub">Dónde ver (Colombia)</h3>
    <div class="watch">
      <span class="watch-chip">DSports / DGO</span>
      <span class="watch-chip">Paramount+</span>
      ${disney ? `<span class="watch-chip">Disney+</span>` : ""}
      ${senalAbierta ? `<span class="watch-chip watch-chip--free">📺 Caracol</span><span class="watch-chip watch-chip--free">📺 RCN</span>` : ""}
    </div>
    <p class="watch-note">${senalAbierta
      ? `Gratis en señal abierta por <b>Caracol</b> y <b>RCN</b>. También por ${pagos}.`
      : `Disponible por <b>${pagos}</b> · este partido no va por señal abierta.`}</p>`;

  // Resumen en video, incrustado debajo de estadísticas. Solo para partidos
  // YA jugados (el resumen no existe antes). El videoId lo busca /api/youtube.
  const mostrarVideo = nh !== "Por definir" && na !== "Por definir" && estado === "fin";
  const videoHTML = mostrarVideo
    ? `<h3 class="tm-sub">Resumen en video</h3><div class="yt-video" id="ytVideo">${spinnerHTML("Buscando el resumen...")}</div>`
    : "";

  // Recordatorios: seguir el partido (avisos en vivo) + agregar al calendario (.ics).
  // Solo para partidos por jugar o en vivo (los terminados no se siguen).
  const matchId = (calMatch && calMatch.id) || detail.IdMatch || null;
  const matchStage = (calMatch && calMatch.stage) || detail.IdStage || "";
  const kickoffTs = (calMatch && calMatch.ts) || (isNaN(d.getTime()) ? null : d.getTime());
  const seguible = matchId && kickoffTs && (estado === "prog" || estado === "live");
  const yaSigo = seguible && typeof Notify !== "undefined" && Notify.isFollowing(matchId);
  const recordHTML = seguible
    ? `<div class="mm-actions">
        <button class="mm-act mm-act--follow ${yaSigo ? "is-on" : ""}" data-mid="${matchId}" data-mstage="${matchStage}" data-mts="${kickoffTs}" data-mh="${nh}" data-ma="${na}">
          <span class="mm-act__ico">${yaSigo ? "🔕" : "🔔"}</span>
          <span class="mm-act__txt">${yaSigo ? "Siguiendo" : "Seguir partido"}</span>
        </button>
        ${estado === "prog"
          ? `<button class="mm-act mm-act--ics" data-mid="${matchId}" data-mts="${kickoffTs}" data-mh="${nh}" data-ma="${na}" data-mvenue="${(venue || "").replace(/"/g, "")}">
              <span class="mm-act__ico">📅</span><span class="mm-act__txt">Calendario</span>
            </button>`
          : ""}
      </div>`
    : "";

  $matchContent.innerHTML = `
    <div class="mm-head">
      <div class="mm-team"><img src="${ch}" alt="" /><span>${nh}</span></div>
      <div class="mm-center">${centro}${estadoTxt}</div>
      <div class="mm-team"><img src="${ca}" alt="" /><span>${na}</span></div>
    </div>
    <div class="modal-pad">
      ${meta ? `<p class="mm-meta">${meta}</p>` : ""}
      ${recordHTML}
      ${momentosHTML}
      ${alinHTML}
      ${statsHTML}
      ${videoHTML}
      ${oddsHTML}
      ${verHTML}
    </div>`;

  if (mostrarVideo) hydrateMatchVideo(document.getElementById("ytVideo"), nh, na);
}


const matchCache = {};

let matchReqId = 0;
async function openMatch(stage, id) {
  const myReq = ++matchReqId;
  openModal($matchModal);
  $matchContent.innerHTML = spinnerHTML("Cargando partido...");
  try {
    // Los partidos en vivo no se cachean para ver siempre lo último.
    let data = matchCache[id];
    if (!data) {
      data = await fetchMatch(stage, id);
      if (fifaState(data.detail.MatchStatus) === "fin") matchCache[id] = data;
    }
    if (myReq !== matchReqId) return; // se abrió otro partido después
    renderMatch(data);
  } catch (err) {
    if (myReq === matchReqId) $matchContent.innerHTML = modalError(err.message);
  }
}