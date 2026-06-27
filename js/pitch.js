/* =====================================================================
   Mundial 2026 - Formacion dibujada en la cancha (a partir del string de tactica)
   Parte de la logica antes en app.js. Script clasico (scope global);
   depende de data.js (cargar antes).
   ===================================================================== */
// ---- Formación dibujada en la cancha (a partir del string de táctica) ----
// FIFA no entrega coordenadas (LineupX/Y vienen vacías), pero sí la táctica
// ("4-1-2-3") y los titulares EN ORDEN de formación, así que ubicamos por filas.
function parseTactics(str, nOutfield) {
  const rows = String(str || "").split("-").map(Number).filter((n) => n > 0);
  const suma = rows.reduce((a, b) => a + b, 0);
  return rows.length && suma === nOutfield ? rows : null;
}
function sliceRows(arr, sizes) {
  const out = [];
  let i = 0;
  for (const s of sizes) {
    out.push(arr.slice(i, i + s));
    i += s;
  }
  return out;
}
// Asigna _x/_y (en %) a los 11 titulares de un equipo según su lado del campo.
function placeTeam(team, side) {
  const starters = (team.Players || []).filter((p) => p.Status === 1);
  if (starters.length < 11) return null;
  const gk = starters[0];
  const outfield = starters.slice(1);
  const rows = parseTactics(team.Tactics, outfield.length);
  const cols = rows ? [[gk], ...sliceRows(outfield, rows)] : [[gk], outfield];
  const n = cols.length;
  cols.forEach((col, ci) => {
    const frac = n > 1 ? ci / (n - 1) : 0; // 0 = arquero (atrás) → 1 = delanteros (centro)
    const xHome = 5 + frac * 41;
    const x = side === "home" ? xHome : 100 - xHome;
    col.forEach((p, pi) => {
      p._x = x;
      p._y = (100 / (col.length + 1)) * (pi + 1);
    });
  });
  return cols.flat();
}
function pitchDot(p, side) {
  const apellido = (loc(p.PlayerName) || "").trim().split(/\s+/).pop() || "";
  return `<div class="pitch-dot pitch-dot--${side}" style="left:${p._x}%;top:${p._y}%">
    <span class="pitch-num">${p.ShirtNumber ?? ""}</span>
    <span class="pitch-name">${apellido}${p.Captain ? " (C)" : ""}</span>
  </div>`;
}
function fifaPitch(home, away) {
  const ph = placeTeam(home, "home");
  const pa = placeTeam(away, "away");
  if (!ph || !pa) return "";
  return `<div class="pitch" role="img" aria-label="Formaciones: ${loc(home.TeamName)} ${home.Tactics || ""} vs ${loc(away.TeamName)} ${away.Tactics || ""}">
    <div class="pitch-mid"></div><div class="pitch-circle"></div>
    <span class="pitch-tac pitch-tac--home">${home.Tactics || ""}</span>
    <span class="pitch-tac pitch-tac--away">${away.Tactics || ""}</span>
    ${ph.map((p) => pitchDot(p, "home")).join("")}
    ${pa.map((p) => pitchDot(p, "away")).join("")}
  </div>`;
}