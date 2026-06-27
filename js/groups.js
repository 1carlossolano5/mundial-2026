/* =====================================================================
   Mundial 2026 - Grupos: tablas de posiciones en vivo
   Parte de la logica antes en app.js. Script clasico (scope global);
   depende de data.js (cargar antes).
   ===================================================================== */
// ---- Grupos (tablas de posiciones en vivo, calculadas del calendario) ----
let gruposCargados = false;
const $gruposGrid = document.getElementById("gruposGrid");
const $gruposStatus = document.getElementById("gruposStatus");

// Tabla de cada grupo a partir de los resultados del calendario FIFA.
function computeGroupStandings(cal) {
  const grupos = {}; // "Grupo A" → { idTeam → fila }
  for (const m of cal) {
    if (!m.group || !/grupo/i.test(m.group)) continue; // solo fase de grupos
    const g = grupos[m.group] || (grupos[m.group] = {});
    // Asegura que las 4 selecciones aparezcan aunque no hayan jugado.
    if (m.homeId && !g[m.homeId]) g[m.homeId] = { id: m.homeId, name: m.home, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 };
    if (m.awayId && !g[m.awayId]) g[m.awayId] = { id: m.awayId, name: m.away, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 };
    const hs = m.homeScore, as = m.awayScore;
    if (hs == null || as == null) continue; // partido aún sin jugar
    const H = g[m.homeId], A = g[m.awayId];
    if (!H || !A) continue;
    H.pj++; A.pj++;
    H.gf += hs; H.gc += as; A.gf += as; A.gc += hs;
    if (hs > as) { H.g++; H.pts += 3; A.p++; }
    else if (hs < as) { A.g++; A.pts += 3; H.p++; }
    else { H.e++; A.e++; H.pts++; A.pts++; }
  }
  const out = {};
  Object.keys(grupos).sort().forEach((gn) => {
    const filas = Object.values(grupos[gn]).map((r) => ({ ...r, dg: r.gf - r.gc }));
    filas.sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.name.localeCompare(b.name));
    out[gn] = filas;
  });
  return out;
}

async function loadGroups() {
  gruposCargados = true;
  $gruposStatus.hidden = false;
  $gruposGrid.innerHTML = "";
  try {
    const [cal, meta] = await Promise.all([fifaCalendar(), fifaTeamMeta()]);
    const standings = computeGroupStandings(cal);
    const nombres = Object.keys(standings);
    $gruposStatus.hidden = true;
    if (!nombres.length) {
      $gruposGrid.innerHTML = `<p class="placeholder">Las posiciones aparecerán cuando la API publique los grupos y resultados.</p>`;
      return;
    }
    $gruposGrid.innerHTML = nombres
      .map((gn) => {
        const filas = standings[gn];
        return `<div class="group-card">
          <div class="group-card__head"><span>${gn}</span></div>
          <div class="stand-wrap">
            <table class="stand stand--full">
              <tr><th></th><th class="stand__th-team">Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr>
              ${filas
                .map((r, i) => {
                  const tm = meta[r.id] || {};
                  const nombre = tm.name || r.name;
                  const crest = tm.crest || "";
                  const cls = i < 2 ? "q1" : i === 2 ? "q3" : "q4";
                  return `<tr class="${cls}" data-team="${nombre}" tabindex="0" role="button" aria-label="Ver ${nombre}">
                    <td>${i + 1}</td>
                    <td class="stand__team"><img src="${crest}" alt="" loading="lazy"><span>${nombre}</span></td>
                    <td>${r.pj}</td><td>${r.g}</td><td>${r.e}</td><td>${r.p}</td>
                    <td>${r.gf}</td><td>${r.gc}</td><td>${r.dg > 0 ? "+" + r.dg : r.dg}</td><td><b>${r.pts}</b></td>
                  </tr>`;
                })
                .join("")}
            </table>
          </div>
        </div>`;
      })
      .join("");
  } catch (err) {
    $gruposStatus.hidden = true;
    gruposCargados = false; // permitir reintentar
    $gruposGrid.innerHTML = `<p class="placeholder">${err.message}</p>`;
  }
}

// Clic (o Enter) en una fila -> modal de la selección.
$gruposGrid.addEventListener("click", (e) => {
  const row = e.target.closest("[data-team]");
  if (row) openTeam(row.dataset.team);
});
$gruposGrid.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const row = e.target.closest("[data-team]");
  if (!row) return;
  e.preventDefault();
  openTeam(row.dataset.team);
});
